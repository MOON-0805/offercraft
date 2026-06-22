import React, { useEffect, useState, useCallback } from 'react';
import { Target, Download, BookOpen, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { api, streamRequest } from '../api/client';
import ReactMarkdown from 'react-markdown';
import type { Resume, JD, InterviewKit as InterviewKitType } from '../types';

export const InterviewKit: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [history, setHistory] = useState<InterviewKitType[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJd, setSelectedJd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [viewItem, setViewItem] = useState<InterviewKitType | null>(null);

  useEffect(() => {
    api.getResumes().then(r => setResumes(r)).catch(() => {});
    api.getJDs().then(j => setJds(j)).catch(() => {});
    api.getInterviewKits().then(h => setHistory(h)).catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedResume || !selectedJd) return;
    setGenerating(true);
    setStreamContent('');

    try {
      await streamRequest(
        '/interview/generate',
        { resume_id: Number(selectedResume), jd_id: Number(selectedJd) },
        (chunk) => setStreamContent(prev => prev + chunk),
        () => {},
      );
      api.getInterviewKits().then(h => setHistory(h));
    } catch (e: any) {
      alert('生成失败: ' + (e?.message || '请检查 API Key 配置'));
    }
    setGenerating(false);
  }, [selectedResume, selectedJd]);

  const handleExport = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview_kit.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getResumeName = (id: number) => resumes.find(r => r.id === id)?.name || `简历#${id}`;
  const getJdTitle = (id: number) => jds.find(j => j.id === id)?.title || `JD#${id}`;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">面试备战包</h1>
        <p className="text-gray-500 text-sm mt-1">高频面经、八股文、项目深挖预测、复习路径建议</p>
      </div>

      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select
                label="选择简历"
                options={[{ value: '', label: '请选择...' }, ...resumes.map(r => ({ value: String(r.id), label: r.name }))]}
                value={selectedResume}
                onChange={e => setSelectedResume(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select
                label="目标 JD"
                options={[{ value: '', label: '请选择...' }, ...jds.map(j => ({ value: String(j.id), label: `${j.title} - ${j.company}` }))]}
                value={selectedJd}
                onChange={e => setSelectedJd(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} loading={generating} disabled={!selectedResume || !selectedJd}>
              <Target className="w-4 h-4" /> {generating ? '生成中...' : '生成备战包'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(streamContent || generating) && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {generating && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-dot" />}
              {generating ? '正在生成...' : '备战包'}
            </CardTitle>
            {streamContent && !generating && (
              <Button size="sm" variant="secondary" onClick={() => handleExport(streamContent)}>
                <Download className="w-3.5 h-3.5" /> 导出 Markdown
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="markdown-content prose max-w-none">
              <ReactMarkdown>{streamContent || ' '}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">历史备战包</h3>
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id} className="hover:border-emerald-300 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-900">{getResumeName(h.resume_id)} → {getJdTitle(h.jd_id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                      <Button size="sm" variant="secondary" onClick={() => setViewItem(h)}>
                        <Eye className="w-3.5 h-3.5" /> 查看
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{h.content?.slice(0, 150) || '无内容'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewItem && (
        <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="面试备战包详情">
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <span>{getResumeName(viewItem.resume_id)} → {getJdTitle(viewItem.jd_id)}</span>
            <span className="text-gray-400">{new Date(viewItem.created_at).toLocaleString()}</span>
          </div>
          <div className="mb-4">
            <Button size="sm" variant="secondary" onClick={() => viewItem.content && handleExport(viewItem.content)}>
              <Download className="w-3.5 h-3.5" /> 导出 Markdown
            </Button>
          </div>
          <div className="markdown-content prose max-w-none max-h-[60vh] overflow-y-auto bg-gray-50 rounded-lg p-4">
            <ReactMarkdown>{viewItem.content || '无内容'}</ReactMarkdown>
          </div>
        </Modal>
      )}
    </div>
  );
};
