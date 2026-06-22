import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.db_sync import schedule_db_upload
from backend import models
from backend.schemas import InterviewKitCreate, InterviewKitOut
from backend.ai_client import stream_deepseek, build_prompt, get_api_key

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.get("")
def list_kits(db: Session = Depends(get_db)):
    kits = db.query(models.InterviewKit).order_by(models.InterviewKit.created_at.desc()).all()
    result = []
    for k in kits:
        d = {
            "id": k.id,
            "jd_id": k.jd_id,
            "resume_id": k.resume_id,
            "content": k.content or "",
            "high_freq_questions": k.high_freq_questions or [],
            "baguwen": k.baguwen or [],
            "project_deep_dive": k.project_deep_dive or [],
            "skill_checklist": k.skill_checklist or [],
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        result.append(d)
    return result


@router.get("/{kit_id}")
def get_kit(kit_id: int, db: Session = Depends(get_db)):
    kit = db.query(models.InterviewKit).filter(models.InterviewKit.id == kit_id).first()
    if not kit:
        raise HTTPException(404, "面试备战包不存在")
    return {
        "id": kit.id,
        "jd_id": kit.jd_id,
        "resume_id": kit.resume_id,
        "content": kit.content or "",
        "high_freq_questions": kit.high_freq_questions or [],
        "baguwen": kit.baguwen or [],
        "project_deep_dive": kit.project_deep_dive or [],
        "skill_checklist": kit.skill_checklist or [],
        "created_at": kit.created_at.isoformat() if kit.created_at else None,
    }


@router.post("/generate")
def generate_kit(body: InterviewKitCreate, db: Session = Depends(get_db)):
    """Stream-generate an interview preparation kit in Markdown format."""
    jd = db.query(models.JobDescription).filter(models.JobDescription.id == body.jd_id).first()
    if not jd:
        raise HTTPException(404, "JD 不存在")

    if not get_api_key():
        raise HTTPException(400, "DeepSeek API Key 未配置")

    resume_text = None
    if body.resume_id:
        resume = db.query(models.Resume).filter(models.Resume.id == body.resume_id).first()
        if resume:
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
            resume_text = "\n\n".join(resume_parts) if resume_parts else None

    system = """你是一个资深面试教练。根据目标岗位 JD 和候选人简历，生成一份**Markdown 格式**的面试备战包。

严格按以下 Markdown 结构输出（不要输出 JSON，直接输出 Markdown）：

# 面试备战包：{岗位名称}

## 一、高频面试题

### 项目深挖
1. 问题1
2. 问题2
...

### 算法与数据结构
1. 问题1
2. 问题2
...

### 系统设计
1. 问题1
2. 问题2
...

### 行为面试
1. 问题1
2. 问题2
...

## 二、八股文速览

### 知识点1
- 要点1
- 要点2
- 要点3

### 知识点2
- 要点1
- 要点2

## 三、项目深挖预测

### 项目：{项目名}
1. 深挖问题1
2. 深挖问题2
...

## 四、技能自查清单

| 技能 | 掌握程度 | 复习建议 |
|------|---------|---------|
| React | ✅ 已掌握 | 继续深入 hooks 原理 |
| ... | ... | ... |

## 五、复习路径建议

### 第一周
- 复习内容1
- 复习内容2

### 第二周
- 复习内容3
- 复习内容4

---
注意：
- 每个模块要有清晰的小标题
- 问题要具体、有深度，不要泛泛而谈
- 八股文要覆盖 JD 中的核心技术栈
- 项目深挖要针对简历中的每个项目生成 5-10 个追问
- 技能自查要与 JD 要求对比
- 复习路径要具体可执行，有优先级"""

    user_msg = f"""## 目标岗位 JD
{jd.raw_jd}

## JD 核心技能
{json.dumps(jd.core_skills, ensure_ascii=False, indent=2)}"""

    if resume_text:
        user_msg += f"""

{resume_text}

请根据简历和 JD 生成面试备战包，特别注意：
1. 简历中每个项目生成 5-10 个深挖问题
2. 技能自查清单要根据简历技能与 JD 要求对比
3. 复习路径要具体可执行
4. 严禁编造简历中没有的项目、技能或经历，所有分析必须基于候选人简历中的真实内容"""
    else:
        user_msg += "\n\n候选人未提供简历，仅根据 JD 生成通用面试备战包。"

    messages = build_prompt(system, user_msg)

    def event_stream():
        full_content = ""
        for chunk in stream_deepseek(messages, temperature=0.7, max_tokens=8000):
            full_content += chunk
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # Save with Markdown content
        kit = models.InterviewKit(
            jd_id=body.jd_id,
            resume_id=body.resume_id,
            content=full_content.strip(),
            high_freq_questions=[],
            baguwen=[],
            project_deep_dive=[],
            skill_checklist=[],
        )
        db2 = next(get_db())
        db2.add(kit)
        db2.commit()
        db2.refresh(kit)
        schedule_db_upload()
        yield f"data: {json.dumps({'done': True, 'id': kit.id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/{kit_id}")
def delete_kit(kit_id: int, db: Session = Depends(get_db)):
    kit = db.query(models.InterviewKit).filter(models.InterviewKit.id == kit_id).first()
    if not kit:
        raise HTTPException(404, "面试备战包不存在")
    db.delete(kit)
    db.commit()
    schedule_db_upload()
    return {"ok": True}
