export interface Resume {
  id: number;
  name: string;
  is_default: boolean;
  raw_text: string;
  basic_info: Record<string, string>;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  start: string;
  end: string;
  highlights?: string[];
}

export interface Experience {
  company: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface Project {
  name: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
  tech_stack: string[];
}

export interface JD {
  id: number;
  title: string;
  company: string;
  raw_jd: string;
  parsed_data: JDParsedData | null;
  keywords: string[];
  keyword_freq: Record<string, number>;
  match_score: number | null;
  missing_skills: string[];
  created_at: string;
  updated_at: string;
}

/** Alias for compatibility */
export type JobDescription = JD;

export interface JDParsedData {
  core_positioning: string;
  required_skills: {
    languages: string[];
    frameworks: string[];
    middleware: string[];
    tools: string[];
    other: string[];
  };
  bonus_skills: string[];
  domain: {
    industry: string;
    business_area: string;
    context: string;
  };
  project_requirements: string[];
  candidate_profile: {
    experience_years: string;
    background: string;
    education: string;
  };
  hidden_requirements: { clue: string; reality: string }[];
  interview_focus: string[];
  keywords: string[];
  keyword_freq: Record<string, number>;
}

export interface TailoredResume {
  id: number;
  resume_id: number;
  jd_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewKit {
  id: number;
  resume_id: number;
  jd_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineItem {
  id: number;
  company: string;
  position: string;
  jd_id: number | null;
  tailored_resume_id: number | null;
  interview_kit_id: number | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const PIPELINE_STATUSES = [
  { value: "applied", label: "已投递", icon: "Send" },
  { value: "written_test", label: "笔试", icon: "FileText" },
  { value: "round_1", label: "一面", icon: "MessageSquare" },
  { value: "round_2", label: "二面", icon: "Users" },
  { value: "round_3", label: "三面", icon: "Shield" },
  { value: "offer", label: "Offer", icon: "Award" },
  { value: "rejected", label: "挂", icon: "XCircle" },
] as const;
