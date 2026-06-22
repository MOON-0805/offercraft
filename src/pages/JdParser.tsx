import React, { useEffect, useState } from 'react';
import { Search, Sparkles, AlertTriangle, CheckCircle, XCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../api/client';
import type { JD, JDParsedData, Resume } from '../types';

const MatchScoreBadge: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null) return null;
  const color = score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
  return <span className={`text-2xl font-bold px-3 py-1 rounded-lg border ${color}`}>{score}%</span>;
};

const SkillTag: React.FC<{ skill: string; matched?: boolean }> = ({ skill, matched }) => (
  <span className={`text-xs px-2 py-1 rounded-full border ${
    matched ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
  }`}>
    {matched ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
    {skill}
  </span>
);

export const JdParser: React.FC = () => {
  const [jds, setJds] = useState<JD[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [selectedJd, setSelectedJd] = useState<JD | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [form, setForm] = useState({ title: '', company: '', raw_jd: '', resume_id: '' });

  const fetchJds = async () => {
    try {
      const data = await api.getJDs();
      setJds(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchJds();
    api.getResumes().then(r => setResumes(r)).catch(() => {});
  }, []);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.raw_jd.trim()) return;
    setParsing(true);
    try {
      const parseBody: { title: string; company: string; raw_jd: string; resume_id?: number } = {
        title: form.title,
        company: form.company,
        raw_jd: form.raw_jd,
      };
      if (form.resume_id) parseBody.resume_id = parseInt(form.resume_id);
      const newJd = await api.parseJD(parseBody);
      fetchJds();
      setSelectedJd(newJd);
      setMissingSkills(newJd.missing_skills || []);
      setForm({ title: '', company: '', raw_jd: '', resume_id: '' });
    } catch (err: any) {
      alert('解析失败: ' + (err?.message || '请先配置 API Key'));
    }
    setParsing(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await api.deleteJD(id);
    if (selectedJd?.id === id) setSelectedJd(null);
    fetchJds();
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderParsed = (jd: JD) => {
    const p = jd.parsed_data as JDParsedData | null;
    if (!p) return <p className="text-gray-500">无解析数据</p>;

    return (
      <div className="space-y-4">
        {/* Core Positioning */}
        {p.core_positioning && (
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
            <div className="text-sm font-medium text-primary-700 mb-1">岗位核心定位</div>
            <div className="text-gray-800">{p.core_positioning}</div>
          </div>
        )}

        {/* Match Score */}
        <div className="flex items-center gap-3">
          <MatchScoreBadge score={jd.match_score} />
          <div>
            <div className="text-sm font-medium text-gray-900">匹配度</div>
            <div className="text-xs text-gray-500">
              {jd.match_score !== null ? (jd.match_score >= 70 ? '匹配度较高' : jd.match_score >= 40 ? '有差距，需补强' : '差距较大') : '未选择简历对比'}
            </div>
          </div>
        </div>

        {/* Required Skills */}
        {p.required_skills && (
          <div>
            <button onClick={() => toggleSection('req')} className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2 hover:text-primary-600">
              {expandedSections['req'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              硬性技能
            </button>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(p.required_skills).filter(([, v]) => v?.length > 0).map(([cat, skills]) => (
                <div key={cat} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2 uppercase">{cat === 'languages' ? '语言' : cat === 'frameworks' ? '框架' : cat === 'middleware' ? '中间件' : cat === 'tools' ? '工具' : '其他'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(skills as string[]).map((s, i) => (
                      <SkillTag key={i} skill={s} matched={!missingSkills.includes(s)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bonus Skills */}
        {p.bonus_skills?.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">加分技能</div>
            <div className="flex flex-wrap gap-1.5">
              {p.bonus_skills.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Domain */}
        {p.domain && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">行业</div>
              <div className="text-sm text-gray-800">{p.domain.industry}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">业务方向</div>
              <div className="text-sm text-gray-800">{p.domain.business_area}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">背景</div>
              <div className="text-sm text-gray-800">{p.domain.context}</div>
            </div>
          </div>
        )}

        {/* Project Requirements */}
        {p.project_requirements?.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">项目经验要求</div>
            <ul className="space-y-1.5">
              {p.project_requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Candidate Profile */}
        {p.candidate_profile && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">候选人画像</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">经验年限</div>
                <div className="text-sm text-gray-800">{p.candidate_profile.experience_years}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">学历</div>
                <div className="text-sm text-gray-800">{p.candidate_profile.education}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500 mb-1">最匹配背景</div>
                <div className="text-sm text-gray-800">{p.candidate_profile.background}</div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Requirements */}
        {p.hidden_requirements?.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 隐藏要求 / 雷区
            </div>
            <div className="space-y-2">
              {p.hidden_requirements.map((h, i) => (
                <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-amber-600 font-medium">JD 原文</div>
                    <div className="text-sm text-gray-800">{h.clue}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-red-600 font-medium">真实含义</div>
                    <div className="text-sm text-gray-800">{h.reality}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Focus */}
        {p.interview_focus?.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">面试重点考察方向</div>
            <div className="flex flex-wrap gap-2">
              {p.interview_focus.map((f, i) => (
                <span key={i} className="text-sm px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-medium">{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {missingSkills.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="text-sm font-semibold text-red-700 mb-2">技能短板</div>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">JD 解析</h1>
        <p className="text-gray-500 text-sm mt-1">深度解析岗位描述，提取硬性要求、隐藏门槛与面试重点</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Parse Form + History */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>解析 JD</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleParse} className="space-y-3">
                <Input label="岗位名称" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例如：高级前端开发" />
                <Input label="公司" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="例如：字节跳动" />
                <Textarea label="JD 内容" value={form.raw_jd} onChange={e => setForm(f => ({ ...f, raw_jd: e.target.value }))} placeholder="粘贴岗位描述..." rows={8} required />
                {resumes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">对比简历（计算匹配度）</label>
                    <select
                      value={form.resume_id}
                      onChange={e => setForm(f => ({ ...f, resume_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">不对比</option>
                      {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}
                <Button type="submit" loading={parsing} className="w-full">
                  <Sparkles className="w-4 h-4" /> {parsing ? '深度解析中...' : '深度解析'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">历史记录</h3>
            <div className="space-y-2">
              {jds.map(jd => (
                <Card key={jd.id} hover onClick={() => { setSelectedJd(jd); setMissingSkills([]); }}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-50">
                        <Search className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{jd.title || '未命名'}</div>
                        <div className="text-xs text-gray-500">{jd.company}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {jd.match_score !== null && (
                        <span className={`text-xs font-bold ${jd.match_score >= 70 ? 'text-emerald-600' : jd.match_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {jd.match_score}%
                        </span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(jd.id); }} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Detail */}
        <div className="lg:col-span-3">
          {selectedJd ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedJd.title || '未命名'}</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedJd.company}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedJd(null)}>
                    关闭
                  </Button>
                </div>
              </CardHeader>
              <CardContent>{renderParsed(selectedJd)}</CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">选择一条 JD 查看深度解析结果</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
