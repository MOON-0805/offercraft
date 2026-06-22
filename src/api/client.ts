const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── SSE Stream Helper ───
export async function streamRequest(
  path: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (id: number) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream');
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.done) {
            onDone(data.id);
          } else if (data.content) {
            onChunk(data.content);
          }
        } catch { /* skip malformed */ }
      }
    }
  }
}

// ─── Resumes ───
export const api = {
  // Resumes
  getResumes: () => request<import('@/types').Resume[]>('/resumes'),
  getResume: (id: number) => request<import('@/types').Resume>(`/resumes/${id}`),
  createResume: (data: Partial<import('@/types').Resume>) =>
    request<import('@/types').Resume>('/resumes', { method: 'POST', body: JSON.stringify(data) }),
  updateResume: (id: number, data: Partial<import('@/types').Resume>) =>
    request<import('@/types').Resume>(`/resumes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteResume: (id: number) => request(`/resumes/${id}`, { method: 'DELETE' }),
  uploadResume: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/resumes/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  parseResume: (id: number) => request(`/resumes/${id}/parse`, { method: 'POST' }),

  // JD
  getJDs: () => request<import('@/types').JD[]>('/jd'),
  getJD: (id: number) => request<import('@/types').JD>(`/jd/${id}`),
  parseJD: (data: { title: string; company: string; raw_jd: string; resume_id?: number }) =>
    request<import('@/types').JD>('/jd/parse', { method: 'POST', body: JSON.stringify(data) }),
  deleteJD: (id: number) => request(`/jd/${id}`, { method: 'DELETE' }),

  // Rewrite
  getTailoredResumes: () => request<import('@/types').TailoredResume[]>('/rewrite'),
  getTailoredResume: (id: number) => request<import('@/types').TailoredResume>(`/rewrite/${id}`),
  deleteTailoredResume: (id: number) => request(`/rewrite/${id}`, { method: 'DELETE' }),

  // Interview
  getInterviewKits: () => request<import('@/types').InterviewKit[]>('/interview'),
  getInterviewKit: (id: number) => request<import('@/types').InterviewKit>(`/interview/${id}`),
  deleteInterviewKit: (id: number) => request(`/interview/${id}`, { method: 'DELETE' }),

  // Pipeline
  getPipelines: () => request<import('@/types').PipelineItem[]>('/pipeline'),
  getPipeline: (id: number) => request<import('@/types').PipelineItem>(`/pipeline/${id}`),
  createPipeline: (data: Partial<import('@/types').PipelineItem>) =>
    request<import('@/types').PipelineItem>('/pipeline', { method: 'POST', body: JSON.stringify(data) }),
  updatePipeline: (id: number, data: Partial<import('@/types').PipelineItem>) =>
    request<import('@/types').PipelineItem>(`/pipeline/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePipeline: (id: number) => request(`/pipeline/${id}`, { method: 'DELETE' }),

  // Settings
  getApiKeyStatus: () => request<{ configured: boolean; masked_key: string }>('/settings/api-key'),
  setApiKey: (key: string) =>
    request('/settings/api-key', { method: 'PUT', body: JSON.stringify({ key: 'DEEPSEEK_API_KEY', value: key }) }),
};
