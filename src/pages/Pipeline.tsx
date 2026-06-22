import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { api } from '../api/client';
import type { PipelineItem } from '../types';
import { PIPELINE_STATUSES } from '../types';

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  written_test: 'bg-amber-100 text-amber-700 border-amber-200',
  round_1: 'bg-violet-100 text-violet-700 border-violet-200',
  round_2: 'bg-purple-100 text-purple-700 border-purple-200',
  round_3: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  offer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const Pipeline: React.FC = () => {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<PipelineItem | null>(null);

  const fetchItems = async () => {
    try {
      const data = await api.getPipelines();
      setItems(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api.createPipeline({
      company: fd.get('company') as string,
      position: fd.get('position') as string,
      status: fd.get('status') as string,
      notes: fd.get('notes') as string,
    });
    setShowCreate(false);
    fetchItems();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await api.deletePipeline(id);
    fetchItems();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await api.updatePipeline(id, { status });
    fetchItems();
  };

  // Group by status for kanban
  const grouped = PIPELINE_STATUSES.map(s => ({
    ...s,
    items: items.filter(i => i.status === s.value),
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">投递追踪</h1>
          <p className="text-gray-500 text-sm mt-1">看板视图管理你的投递进度</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> 新增投递
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {grouped.map(col => (
          <div key={col.value} className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[col.value]}`}>
                {col.label}
              </span>
              <span className="text-xs text-gray-400">{col.items.length}</span>
            </div>
            <div className="space-y-2">
              {col.items.map(item => (
                <Card key={item.id} hover onClick={() => setDetail(item)}>
                  <CardContent className="py-3 px-3">
                    <div className="font-medium text-sm text-gray-900 mb-1">{item.position}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="w-3 h-3" /> {item.company}
                    </div>
                    {item.notes && <div className="text-xs text-gray-400 mt-1 line-clamp-1">{item.notes}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {col.items.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-xs text-gray-400">
                  暂无
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新增投递">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="company" label="公司" placeholder="例如：字节跳动" required />
          <Input name="position" label="岗位" placeholder="例如：高级前端开发" required />
          <Select name="status" label="当前进度" options={PIPELINE_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
          <Textarea name="notes" label="备注" placeholder="可选备注..." rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>取消</Button>
            <Button type="submit">创建</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.position} - ${detail.company}` : ''}>
        {detail && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">更新进度</label>
              <select
                value={detail.status}
                onChange={e => { handleStatusChange(detail.id, e.target.value); setDetail({ ...detail, status: e.target.value }); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PIPELINE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
              <p className="text-sm text-gray-600">{detail.notes || '无'}</p>
            </div>
            <div className="text-xs text-gray-400">
              创建时间：{new Date(detail.created_at).toLocaleString()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
