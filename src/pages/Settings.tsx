import React, { useEffect, useState } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../api/client';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState('');
  const [configured, setConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getApiKeyStatus().then((data) => {
      setConfigured(data.configured);
      setMasked(data.masked_key || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.setApiKey(apiKey) as { ok: boolean; masked_key: string };
      setConfigured(true);
      setMasked(result.masked_key);
      setApiKey('');
      setShowKey(false);
      setMessage({ type: 'success', text: 'API Key 保存成功' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-500 text-sm mt-1">配置 DeepSeek API Key 以启用 AI 功能</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-500" /> DeepSeek API Key
          </CardTitle>
          <CardDescription>用于简历解析、JD 分析、简历改写和面试备战包生成</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configured && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">已配置 API Key: <code className="font-mono">{masked}</code></span>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" /> 保存
            </Button>
          </div>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</span>
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            <p>1. 访问 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-primary-500 hover:underline">DeepSeek 开放平台</a> 获取 API Key</p>
            <p>2. 支持的模型：deepseek-chat、deepseek-reasoner</p>
            <p>3. Key 只存储在本地，不会上传到任何第三方服务</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
