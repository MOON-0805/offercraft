import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Sparkles, Target, Kanban, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/client';

interface Stat { label: string; value: number; icon: React.ReactNode; color: string; to: string; }

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ resumes: 0, jds: 0, rewrites: 0, interviews: 0, pipeline: 0 });

  useEffect(() => {
    (async () => {
      const results = await Promise.allSettled([
        api.getResumes(), api.getJDs(),
        api.getTailoredResumes(), api.getInterviewKits(),
        api.getPipelines(),
      ]);
      const [r, j, rw, ik, p] = results.map(r => r.status === 'fulfilled' ? r.value : []);
      setStats({
        resumes: r.length, jds: j.length,
        rewrites: rw.length, interviews: ik.length,
        pipeline: p.length,
      });
    })();
  }, []);

  const cards: Stat[] = [
    { label: '简历', value: stats.resumes, icon: <FileText className="w-5 h-5" />, color: 'text-primary-600 bg-primary-50', to: '/resumes' },
    { label: 'JD', value: stats.jds, icon: <Search className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50', to: '/jd-parser' },
    { label: '改写版本', value: stats.rewrites, icon: <Sparkles className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50', to: '/rewrite' },
    { label: '备战包', value: stats.interviews, icon: <Target className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50', to: '/interview' },
    { label: '投递', value: stats.pipeline, icon: <Kanban className="w-5 h-5" />, color: 'text-rose-600 bg-rose-50', to: '/pipeline' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">OfferCraft</h1>
        </div>
        <p className="text-gray-500 ml-[52px]">智能简历改写与面试备战，助你斩获心仪 Offer</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card hover className="relative group">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card hover>
          <Link to="/jd-parser" className="block">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">解析 JD</h3>
                <p className="text-sm text-gray-500">粘贴目标岗位 JD，智能提取关键要求</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card hover>
          <Link to="/rewrite" className="block">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">智能改写简历</h3>
                <p className="text-sm text-gray-500">针对 JD 关键词量身定制简历内容</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};
