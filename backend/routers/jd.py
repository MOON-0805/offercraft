import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.db_sync import schedule_db_upload
from backend import models
from backend.schemas import JDCreate, JDUpdate, JDOut
from backend.ai_client import call_deepseek, build_prompt

router = APIRouter(prefix="/api/jd", tags=["jd"])


def _build_jd_dict(jd: models.JobDescription) -> dict:
    """Build a frontend-friendly dict from a JD ORM object, including nested parsed_data."""
    # Parse domain (stored as JSON string or plain text)
    domain = {"industry": "", "business_area": "", "context": ""}
    if jd.business_domain:
        try:
            domain = json.loads(jd.business_domain)
        except (json.JSONDecodeError, TypeError):
            domain = {"industry": str(jd.business_domain), "business_area": "", "context": ""}

    # Parse candidate_profile (stored as JSON string or plain text)
    candidate_profile = {"experience_years": "", "background": "", "education": ""}
    if jd.candidate_profile:
        try:
            candidate_profile = json.loads(jd.candidate_profile)
        except (json.JSONDecodeError, TypeError):
            candidate_profile = {"experience_years": str(jd.candidate_profile), "background": "", "education": ""}

    # Parse hidden_requirements (stored as JSON string or list)
    hidden_requirements = []
    if jd.hidden_requirements:
        try:
            hidden_requirements = json.loads(jd.hidden_requirements) if isinstance(jd.hidden_requirements, str) else jd.hidden_requirements
        except (json.JSONDecodeError, TypeError):
            hidden_requirements = []

    # Build required_skills from hard_skills
    required_skills = {"languages": [], "frameworks": [], "middleware": [], "tools": [], "other": []}
    if jd.hard_skills:
        if isinstance(jd.hard_skills, list) and len(jd.hard_skills) > 0:
            first = jd.hard_skills[0]
            if isinstance(first, dict):
                required_skills = {**required_skills, **first}
            else:
                required_skills["other"] = jd.hard_skills
        elif isinstance(jd.hard_skills, dict):
            required_skills = {**required_skills, **jd.hard_skills}

    # Build project_requirements from newline-separated text
    project_requirements = []
    if jd.project_requirements:
        project_requirements = [r.strip() for r in jd.project_requirements.split("\n") if r.strip()]

    parsed_data = {
        "core_positioning": jd.core_positioning or "",
        "required_skills": required_skills,
        "bonus_skills": jd.bonus_skills or [],
        "domain": domain,
        "project_requirements": project_requirements,
        "candidate_profile": candidate_profile,
        "hidden_requirements": hidden_requirements,
        "interview_focus": jd.interview_focus or [],
    }

    keyword_freq = {}
    if jd.match_details and isinstance(jd.match_details, dict):
        keyword_freq = jd.match_details.get("keyword_freq", {})

    return {
        "id": jd.id,
        "title": jd.title,
        "company": jd.company or "",
        "raw_jd": jd.raw_jd or "",
        "core_positioning": jd.core_positioning or "",
        "hard_skills": jd.hard_skills or [],
        "bonus_skills": jd.bonus_skills or [],
        "business_domain": jd.business_domain or "",
        "project_requirements": jd.project_requirements or "",
        "candidate_profile": jd.candidate_profile or "",
        "hidden_requirements": jd.hidden_requirements or "",
        "interview_focus": jd.interview_focus or [],
        "core_skills": jd.core_skills or [],
        "hard_requirements": jd.hard_requirements or [],
        "nice_to_haves": jd.nice_to_haves or [],
        "match_score": jd.match_score,
        "missing_skills": jd.missing_skills or [],
        "match_details": jd.match_details or {},
        "resume_id": jd.resume_id,
        "parsed_data": parsed_data,
        "keywords": jd.core_skills or [],
        "keyword_freq": keyword_freq,
        "created_at": jd.created_at.isoformat() if jd.created_at else None,
        "updated_at": jd.updated_at.isoformat() if jd.updated_at else None,
    }


def _get_default_resume(db: Session):
    """Get the user's default resume, or any resume if no default is set."""
    resume = db.query(models.Resume).filter(models.Resume.is_default == True).first()
    if not resume:
        resume = db.query(models.Resume).order_by(models.Resume.updated_at.desc()).first()
    return resume


def _compute_match_score(resume: models.Resume, parsed: dict) -> tuple:
    """
    Compute match score based on resume content vs JD requirements.
    Returns (match_score: float | None, missing_skills: list[str], match_details: dict)
    """
    if not resume:
        return None, [], {"has_resume": False}

    # Collect all skills from the resume
    resume_text_lower = (resume.raw_text or "").lower()

    # Extract skills from resume.skills list
    resume_skill_words = set()
    for s in (resume.skills or []):
        resume_skill_words.add(s.lower())

    # Also tokenize raw_text for broader matching
    for word in resume_text_lower.replace(",", " ").replace("，", " ").replace("、", " ").split():
        if len(word) > 1:
            resume_skill_words.add(word)

    # Collect all required skills from JD
    all_required: list[str] = []
    req = parsed.get("required_skills", {})
    for category in ["languages", "frameworks", "middleware", "tools", "other"]:
        all_required.extend(req.get(category, []))

    if not all_required:
        return None, [], {"has_resume": True, "no_required_skills": True}

    # Compute match
    matched = 0
    missing_skills: list[str] = []
    matched_skills: list[str] = []

    for skill in all_required:
        skill_lower = skill.lower().strip()
        # Check if skill or any part of it appears in resume
        found = (
            skill_lower in resume_skill_words
            or any(skill_lower in w or w in skill_lower for w in resume_skill_words if len(w) > 1)
            or skill_lower in resume_text_lower
        )
        if found:
            matched += 1
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)

    match_score = round(matched / len(all_required) * 100) if all_required else 0

    match_details = {
        "has_resume": True,
        "matched_skills": matched_skills,
        "total_required": len(all_required),
        "matched_count": matched,
    }

    return match_score, missing_skills, match_details


@router.get("")
def list_jds(db: Session = Depends(get_db)):
    records = db.query(models.JobDescription).order_by(models.JobDescription.updated_at.desc()).all()
    return [_build_jd_dict(jd) for jd in records]


@router.get("/{jd_id}")
def get_jd(jd_id: int, db: Session = Depends(get_db)):
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(404, "JD 不存在")
    return _build_jd_dict(jd)


@router.put("/{jd_id}")
def update_jd(jd_id: int, body: JDUpdate, db: Session = Depends(get_db)):
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(404, "JD 不存在")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(jd, k, v)
    db.commit()
    db.refresh(jd)
    schedule_db_upload()
    return _build_jd_dict(jd)


@router.delete("/{jd_id}")
def delete_jd(jd_id: int, db: Session = Depends(get_db)):
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(404, "JD 不存在")
    db.delete(jd)
    db.commit()
    schedule_db_upload()
    return {"ok": True}


@router.post("/parse")
def parse_jd(body: dict, db: Session = Depends(get_db)):
    """
    Deep JD parsing: extract structured information from a JD text.
    Also computes match score against the user's default resume (if any).
    """
    title = body.get("title", "")
    company = body.get("company", "")
    raw_jd = body.get("raw_jd", "")
    resume_id = body.get("resume_id")

    if not raw_jd.strip():
        raise HTTPException(400, "JD 内容不能为空")

    # Find the resume for matching (explicit or default)
    resume = None
    if resume_id:
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        resume = _get_default_resume(db)

    system = """你是一位资深的猎头与技术面试官，擅长从岗位描述中提取深层信息。请对用户提供的 JD 进行深度解析。

严格按以下 JSON 格式输出（不要多余文字，不要 markdown 包裹）：
{
  "core_positioning": "一句话总结这个岗位在做什么、解决什么问题",
  "required_skills": {
    "languages": ["..."],
    "frameworks": ["..."],
    "middleware": ["..."],
    "tools": ["..."],
    "other": ["..."]
  },
  "bonus_skills": ["加分技能1", "加分技能2"],
  "domain": {
    "industry": "行业领域",
    "business_area": "业务方向",
    "context": "业务背景简述"
  },
  "project_requirements": [
    "需要什么样的项目经历佐证1",
    "需要什么样的项目经历佐证2"
  ],
  "candidate_profile": {
    "experience_years": "经验年限要求",
    "background": "最匹配的候选人背景描述",
    "education": "学历要求"
  },
  "hidden_requirements": [
    {"clue": "JD原文中的措辞", "reality": "背后的真实要求"}
  ],
  "interview_focus": [
    "面试可能重点考察的技术方向1",
    "面试可能重点考察的技术方向2",
    "面试可能重点考察的技术方向3"
  ],
  "keywords": ["关键词1", "关键词2"],
  "keyword_freq": {"关键词": 1}
}"""

    user_text = f"岗位：{title}\n公司：{company}\n\nJD 内容：\n{raw_jd}"
    messages = build_prompt(system, user_text)

    try:
        result = call_deepseek(messages, temperature=0.15, max_tokens=4096)
    except ValueError as e:
        raise HTTPException(400, str(e))

    result = result.strip()
    if result.startswith("```"):
        result = result.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(500, "AI 返回格式异常，请重试")

    # Compute match score against the user's resume
    match_score, missing_skills, match_details = _compute_match_score(resume, parsed)

    # Build the JD record with deep structured fields
    jd_record = models.JobDescription(
        title=title,
        company=company,
        raw_jd=raw_jd,
        core_positioning=parsed.get("core_positioning", ""),
        hard_skills=[parsed.get("required_skills", {})],
        bonus_skills=parsed.get("bonus_skills", []),
        business_domain=json.dumps(parsed.get("domain", {}), ensure_ascii=False),
        project_requirements="\n".join(parsed.get("project_requirements", [])),
        candidate_profile=json.dumps(parsed.get("candidate_profile", {}), ensure_ascii=False),
        hidden_requirements=json.dumps(parsed.get("hidden_requirements", []), ensure_ascii=False),
        interview_focus=parsed.get("interview_focus", []),
        # Legacy fields (kept for compatibility)
        core_skills=parsed.get("keywords", []),
        hard_requirements=parsed.get("required_skills", {}),
        nice_to_haves=parsed.get("bonus_skills", []),
        match_score=match_score,
        missing_skills=missing_skills,
        match_details={
            "keyword_freq": parsed.get("keyword_freq", {}),
            "resume_id": resume.id if resume else None,
            **match_details,
        },
        resume_id=resume.id if resume else None,
    )
    db.add(jd_record)
    db.commit()
    db.refresh(jd_record)
    schedule_db_upload()

    # Return full JD dict
    result_dict = _build_jd_dict(jd_record)
    # Override match_score with None if no resume, so frontend can differentiate
    if not resume:
        result_dict["match_score"] = None
    return result_dict
