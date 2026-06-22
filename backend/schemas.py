from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, Any
from datetime import datetime


# ─── Resume ───
class ResumeCreate(BaseModel):
    name: str
    is_default: bool = False
    raw_text: str = ""
    basic_info: dict = {}
    education: list = []
    experience: list = []
    projects: list = []
    skills: list = []
    source_type: str = "manual"


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    raw_text: Optional[str] = None
    basic_info: Optional[dict] = None
    education: Optional[list] = None
    experience: Optional[list] = None
    projects: Optional[list] = None
    skills: Optional[list] = None


class ResumeOut(BaseModel):
    id: int
    name: str
    is_default: bool
    raw_text: str
    basic_info: dict
    education: list
    experience: list
    projects: list
    skills: list
    source_type: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── JD ───
class JDCreate(BaseModel):
    title: str
    company: str = ""
    raw_jd: str
    resume_id: Optional[int] = None


class JDUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    raw_jd: Optional[str] = None


class JDOut(BaseModel):
    id: int
    title: str
    company: str = ""
    raw_jd: str = ""
    # Deep structured output (flat DB columns)
    core_positioning: str = ""
    hard_skills: list = []
    bonus_skills: list = []
    business_domain: str = ""
    project_requirements: str = ""
    candidate_profile: str = ""
    hidden_requirements: str = ""
    interview_focus: list = []
    # Legacy fields
    core_skills: list = []
    hard_requirements: list = []
    nice_to_haves: list = []
    # Matching
    match_score: float = 0
    missing_skills: list = []
    match_details: dict = {}
    resume_id: Optional[int] = None
    # Frontend convenience: nested parsed_data
    parsed_data: Optional[Any] = None
    keywords: list = []
    keyword_freq: dict = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Tailored Resume ───
class TailoredResumeCreate(BaseModel):
    resume_id: int
    jd_id: int


class TailoredResumeOut(BaseModel):
    id: int
    resume_id: int
    jd_id: int
    tailored_content: str
    content: str = ""
    match_analysis: dict = {}
    created_at: Optional[datetime] = None

    @model_validator(mode='after')
    def fill_content(self):
        if not self.content and self.tailored_content:
            self.content = self.tailored_content
        return self

    model_config = {"from_attributes": True}


# ─── Interview Kit ───
class InterviewKitCreate(BaseModel):
    jd_id: int
    resume_id: Optional[int] = None


class InterviewKitOut(BaseModel):
    id: int
    jd_id: int
    resume_id: Optional[int]
    content: str = ""
    high_freq_questions: list = []
    baguwen: list = []
    project_deep_dive: list = []
    skill_checklist: list = []
    created_at: Optional[datetime] = None


# ─── Pipeline ───
class PipelineCreate(BaseModel):
    company: str
    position: str
    jd_id: Optional[int] = None
    tailored_resume_id: Optional[int] = None
    interview_kit_id: Optional[int] = None
    status: str = "applied"
    notes: str = ""


class PipelineUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tailored_resume_id: Optional[int] = None
    interview_kit_id: Optional[int] = None


class PipelineOut(BaseModel):
    id: int
    company: str
    position: str
    jd_id: Optional[int]
    tailored_resume_id: Optional[int]
    interview_kit_id: Optional[int]
    status: str
    notes: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Settings ───
class SettingUpdate(BaseModel):
    key: str
    value: str


class SettingOut(BaseModel):
    id: int
    key: str
    value: str
