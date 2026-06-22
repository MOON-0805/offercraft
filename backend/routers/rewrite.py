import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.db_sync import schedule_db_upload
from backend import models
from backend.schemas import TailoredResumeCreate, TailoredResumeOut
from backend.ai_client import stream_deepseek, build_prompt, get_api_key

router = APIRouter(prefix="/api/rewrite", tags=["rewrite"])


@router.get("")
def list_tailored(db: Session = Depends(get_db)):
    items = db.query(models.TailoredResume).order_by(models.TailoredResume.created_at.desc()).all()
    result = []
    for t in items:
        result.append({
            "id": t.id,
            "resume_id": t.resume_id,
            "jd_id": t.jd_id,
            "content": t.tailored_content or "",
            "match_analysis": t.match_analysis or "",
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result


@router.get("/{tailored_id}")
def get_tailored(tailored_id: int, db: Session = Depends(get_db)):
    t = db.query(models.TailoredResume).filter(models.TailoredResume.id == tailored_id).first()
    if not t:
        raise HTTPException(404, "定制简历不存在")
    return {
        "id": t.id,
        "resume_id": t.resume_id,
        "jd_id": t.jd_id,
        "content": t.tailored_content or "",
        "match_analysis": t.match_analysis or "",
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.post("/generate")
def generate_tailored(body: TailoredResumeCreate, db: Session = Depends(get_db)):
    """Stream-generate a tailored resume. Returns SSE."""
    resume = db.query(models.Resume).filter(models.Resume.id == body.resume_id).first()
    if not resume:
        raise HTTPException(404, "简历不存在")
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == body.jd_id).first()
    if not jd:
        raise HTTPException(404, "JD 不存在")

    if not get_api_key():
        raise HTTPException(400, "DeepSeek API Key 未配置")

    # Build resume content — raw_text is the primary source of truth
    resume_parts = []
    if resume.raw_text:
        resume_parts.append(f"## 候选人简历原文\n{resume.raw_text}")
    if resume.basic_info:
        resume_parts.append(f"## 基本信息\n{json.dumps(resume.basic_info, ensure_ascii=False, indent=2)}")
    if resume.education:
        resume_parts.append(f"## 教育背景\n{json.dumps(resume.education, ensure_ascii=False, indent=2)}")
    if resume.experience:
        resume_parts.append(f"## 工作经历\n{json.dumps(resume.experience, ensure_ascii=False, indent=2)}")
    if resume.projects:
        resume_parts.append(f"## 项目经历\n{json.dumps(resume.projects, ensure_ascii=False, indent=2)}")
    if resume.skills:
        resume_parts.append(f"## 技能清单\n{json.dumps(resume.skills, ensure_ascii=False, indent=2)}")
    resume_text = "\n\n".join(resume_parts) if resume_parts else "（简历内容为空）"

    system = """你是一个资深简历优化专家。根据目标岗位JD，将用户的主简历改写为一份量身定制的简历。

改写原则（必须严格遵守）：
1. **事实为本**：严格基于用户提供的事实改写，不得编造不存在的项目、技能、数据或经历。如果用户没有某项JD要求的技能，不要强行添加，但可以在描述中突出相关的已有技能
2. **关键词对齐**：把 JD 高频词自然融入简历描述，但必须基于用户真实技能。如果JD要求"微服务"而用户做过"分布式系统"，可以自然地使用微服务相关术语描述已有经验
3. **经历重排**：把最相关的项目/经历提到前面，不增删项目
4. **Bullet 优化**：动词开头 + 保留原有的量化成果数据 + 命中关键词。保留原始数字（如"提升了30%"、"日活500万"），不要修改或编造数字
5. **技能匹配**：优先展示 JD 要求且用户确实掌握的技能，不添加用户未提及的技能
6. **措辞保留**：严格保留原简历的具体项目名、公司名、技术栈名称、数字成果，只优化表达方式和侧重点
7. **差异化调整**：对不同JD，差异应体现在"侧重点调整"（哪些经历更突出）和"JD关键词自然融入"（用词贴近JD），而不是编造新内容

输出 Markdown 格式的完整简历，包含：基本信息、教育背景、工作/实习经历、项目经历、技能清单。
确保输出可以直接作为简历使用。不要添加额外解释。"""

    user_msg = f"""## 目标岗位 JD
{jd.raw_jd}

## JD 核心技能要求
{json.dumps(jd.core_skills, ensure_ascii=False, indent=2)}

## 我的主简历
{resume_text}

请根据以上 JD 改写我的简历，输出 Markdown 格式。"""

    messages = build_prompt(system, user_msg)

    def event_stream():
        full_content = ""
        for chunk in stream_deepseek(messages, temperature=0.7, max_tokens=4096):
            full_content += chunk
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        # Save to DB after generation completes
        t = models.TailoredResume(
            resume_id=body.resume_id,
            jd_id=body.jd_id,
            tailored_content=full_content,
            match_analysis={"jd_title": jd.title, "resume_name": resume.name},
        )
        db2 = next(get_db())
        db2.add(t)
        db2.commit()
        db2.refresh(t)
        yield f"data: {json.dumps({'done': True, 'id': t.id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/{tailored_id}")
def delete_tailored(tailored_id: int, db: Session = Depends(get_db)):
    t = db.query(models.TailoredResume).filter(models.TailoredResume.id == tailored_id).first()
    if not t:
        raise HTTPException(404, "定制简历不存在")
    db.delete(t)
    db.commit()
    schedule_db_upload()
    return {"ok": True}
