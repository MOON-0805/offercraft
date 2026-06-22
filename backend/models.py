from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON
from sqlalchemy.sql import func
from backend.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    is_default = Column(Boolean, default=False)
    raw_text = Column(Text, default="")
    basic_info = Column(JSON, default=dict)  # {name, email, phone, github, blog}
    education = Column(JSON, default=list)   # [{school, degree, major, start, end, highlights}]
    experience = Column(JSON, default=list)  # [{company, title, start, end, bullets}]
    projects = Column(JSON, default=list)    # [{name, role, start, end, bullets, tech_stack}]
    skills = Column(JSON, default=list)      # ["Python", "React", ...]
    source_type = Column(String(20), default="manual")  # manual, pdf, docx, md
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    company = Column(String(200), default="")
    raw_jd = Column(Text, nullable=False)
    # Deep structured output
    core_positioning = Column(Text, default="")              # 岗位核心定位
    hard_skills = Column(JSON, default=list)                  # 硬性技能 [{category, skills:[]}]
    bonus_skills = Column(JSON, default=list)                 # 加分技能 [str]
    business_domain = Column(Text, default="")                # 业务领域 & 行业背景
    project_requirements = Column(Text, default="")           # 关键项目经验要求
    candidate_profile = Column(Text, default="")              # 候选人画像
    hidden_requirements = Column(Text, default="")            # 隐藏要求/雷区
    interview_focus = Column(JSON, default=list)              # 面试重点考察方向 [str]
    # Legacy fields (kept for compatibility)
    core_skills = Column(JSON, default=list)
    hard_requirements = Column(JSON, default=list)
    nice_to_haves = Column(JSON, default=list)
    # Matching
    match_score = Column(Float, nullable=True, default=None)
    missing_skills = Column(JSON, default=list)
    match_details = Column(JSON, default=dict)                # Detailed match breakdown
    resume_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# Alias for convenience
JD = JobDescription


class TailoredResume(Base):
    __tablename__ = "tailored_resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, nullable=False)
    jd_id = Column(Integer, nullable=False)
    tailored_content = Column(Text, default="")     # Markdown
    match_analysis = Column(JSON, default=dict)      # {score, aligned_keywords, reordered_items}
    created_at = Column(DateTime, server_default=func.now())


class InterviewKit(Base):
    __tablename__ = "interview_kits"

    id = Column(Integer, primary_key=True, index=True)
    jd_id = Column(Integer, nullable=False)
    resume_id = Column(Integer, nullable=True)
    content = Column(Text, default="")                    # Full markdown content
    high_freq_questions = Column(JSON, default=list)  # [{category, questions:[]}]
    baguwen = Column(JSON, default=list)              # [{topic, key_points:[]}]
    project_deep_dive = Column(JSON, default=list)    # [{project_name, questions:[]}]
    skill_checklist = Column(JSON, default=list)      # [{skill, status, review_path}]
    created_at = Column(DateTime, server_default=func.now())


class Pipeline(Base):
    __tablename__ = "pipeline"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(200), nullable=False)
    position = Column(String(300), nullable=False)
    jd_id = Column(Integer, nullable=True)
    tailored_resume_id = Column(Integer, nullable=True)
    interview_kit_id = Column(Integer, nullable=True)
    status = Column(String(30), default="applied")
    # applied | written_test | round_1 | round_2 | round_3 | offer | rejected
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, default="")
