import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, Download, FileText, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { api, streamRequest } from '../api/client';
import ReactMarkdown from 'react-markdown';
import type { Resume, JD, TailoredResume } from '../types';

export const ResumeRewrite: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [history, setHistory] = useState<TailoredResume[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [selectedJd, setSelectedJd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [viewItem, setViewItem] = useState<TailoredResume | null>(null);

  useEffect(() => {
    api.getResumes().then(r => setResumes(r)).catch(() => {});
    api.getJDs().then(j => setJds(j)).catch(() => {});
    api.getTailoredResumes().then(h => setHistory(h)).catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedResume || !selectedJd) return;
    setGenerating(true);
    setStreamContent('');

    try {
      await streamRequest(
        '/rewrite/generate',
        { resume_id: Number(selectedResume), jd_id: Number(selectedJd) },
        (chunk) => setStreamContent(prev => prev + chunk),
        () => {},
      );
      api.getTailoredResumes().then(h => setHistory(h));
    } catch (e: any) {
      alert('生成失败: ' + (e?.message || '请检查 API Key 配置'));
    }
    setGenerating(false);
  }, [selectedResume, selectedJd]);

  const handleExport = (content: string, format: 'md' | 'html') => {
    const blob = new Blob([format === 'html' ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resume</title><style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6;}h1{border-bottom:2px solid #0EA47A;padding-bottom:0.5rem;}h2{color:#0EA47A;}</style></head><body>${renderHtml(content)}</body></html>` : content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailored_resume.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderHtml = (md: string) => {
    return md.replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n/g, '<br/>');
  };

  const getResumeName = (id: number) => resumes.find(r => r.id === id)?.name || `简历#${id}`;
  const getJdTitle = (id: number) => jds.find(j => j.id === id)?.title || `JD#${id}`;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">简历智能改写</h1>
        <p className="text-gray-500 text-sm mt-1">AI 量身改写简历，关键词对齐 + 经历重排 + Bullet 优化</p>
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
              <Sparkles className="w-4 h-4" /> {generating ? '生成中...' : '开始改写'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stream output */}
      {(streamContent || generating) && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {generating && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-dot" />}
              {generating ? '正在生成...' : '改写结果'}
            </CardTitle>
            {streamContent && !generating && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleExport(streamContent, 'md')}>
                  <Download className="w-3.5 h-3.5" /> Markdown
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExport(streamContent, 'html')}>
                  <Download className="w-3.5 h-3.5" /> HTML
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="markdown-content prose max-w-none">
              <ReactMarkdown>{streamContent || ' '}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">历史改写</h3>
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id} className="hover:border-primary-300 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-500" />
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
        <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="改写详情">
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <span>{getResumeName(viewItem.resume_id)} → {getJdTitle(viewItem.jd_id)}</span>
            <span className="text-gray-400">{new Date(viewItem.created_at).toLocaleString()}</span>
          </div>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="secondary" onClick={() => viewItem.content && handleExport(viewItem.content, 'md')}>
              <Download className="w-3.5 h-3.5" /> Markdown
            </Button>
            <Button size="sm" variant="secondary" onClick={() => viewItem.content && handleExport(viewItem.content, 'html')}>
              <Download className="w-3.5 h-3.5" /> HTML
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
