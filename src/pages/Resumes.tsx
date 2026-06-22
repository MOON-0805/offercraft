import React, { useEffect, useState, useRef } from 'react';
import { FileText, Plus, Upload, Trash2, Edit3, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../api/client';
import type { Resume } from '../types';

export const Resumes: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Resume | null>(null);
  const [parsing, setParsing] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    try {
      const data = await api.getResumes();
      setResumes(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api.createResume({
      name: fd.get('name') as string,
      raw_text: fd.get('raw_text') as string,
      source_type: 'manual',
    });
    setShowCreate(false);
    fetchResumes();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadResume(file);
      fetchResumes();
    } catch (err: any) {
      alert('上传失败: ' + (err?.message || '未知错误'));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleParse = async (id: number) => {
    setParsing(id);
    try {
      await api.parseResume(id);
      fetchResumes();
    } catch (err: any) {
      alert('解析失败: ' + (err?.message || '请先配置 API Key'));
    }
    setParsing(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await api.deleteResume(id);
    fetchResumes();
  };

  const handleSetDefault = async (id: number) => {
    await api.updateResume(id, { is_default: true });
    fetchResumes();
  };

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showEdit) return;
    const fd = new FormData(e.currentTarget);
    await api.updateResume(showEdit.id, {
      name: fd.get('name') as string,
      raw_text: fd.get('raw_text') as string,
    });
    setShowEdit(null);
    fetchResumes();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">简历管理</h1>
          <p className="text-gray-500 text-sm mt-1">上传或手动创建你的主简历，AI 会帮你解析结构化</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4" /> {uploading ? '上传中...' : '上传简历'}
          </Button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.txt" className="hidden" onChange={handleUpload} />
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> 手动创建
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-40 rounded-xl animate-shimmer" />)}
        </div>
      ) : resumes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">还没有简历，上传或手动创建一份吧</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {resumes.map((r) => (
            <Card key={r.id} hover>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary-50">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {r.source_type.toUpperCase()}
                      </span>
                      {r.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium">
                          默认
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!r.is_default && (
                    <button onClick={() => handleSetDefault(r.id)} title="设为默认" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setShowEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4 font-sans leading-relaxed">
                  {r.raw_text?.slice(0, 300)}{r.raw_text && r.raw_text.length > 300 ? '...' : ''}
                </pre>
                {r.skills && r.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.skills.slice(0, 8).map((s: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        {s}
                      </span>
                    ))}
                    {r.skills.length > 8 && <span className="text-xs text-gray-400">+{r.skills.length - 8}</span>}
                  </div>
                )}
                {(!r.skills || r.skills.length === 0) && r.raw_text && (
                  <Button size="sm" variant="ghost" className="mt-2" loading={parsing === r.id} onClick={() => handleParse(r.id)}>
                    <Sparkles className="w-3.5 h-3.5" /> AI 解析结构化
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="手动创建简历">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="name" label="简历名称" placeholder="例如：我的主简历" required />
          <Textarea name="raw_text" label="简历内容" placeholder="粘贴你的简历文本内容..." rows={12} required />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>取消</Button>
            <Button type="submit">创建</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="编辑简历">
        {showEdit && (
          <form onSubmit={handleEditSave} className="space-y-4">
            <Input name="name" label="简历名称" defaultValue={showEdit.name} required />
            <Textarea name="raw_text" label="简历内容" defaultValue={showEdit.raw_text} rows={16} required />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowEdit(null)}>取消</Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
