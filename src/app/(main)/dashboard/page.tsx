'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import { CheckSquare, Clock, AlertCircle, LayoutDashboard, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { tasks, currentUser } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleTasks = scope === 'mine'
    ? tasks.filter(t => t.assigneeId === currentUser?.id)
    : tasks;

  const inProgress = visibleTasks.filter(t => t.status === 'in-progress').length;
  const delayed = visibleTasks.filter(t => t.status === 'delayed').length;
  const shipped = visibleTasks.filter(t => t.status === 'shipped').length;
  const pending = visibleTasks.filter(t => t.status === 'pending-distribution').length;

  const data = [
    { name: '대기중', count: pending, fill: '#E5E7EB' },
    { name: '진행중', count: inProgress, fill: '#3B82F6' },
    { name: '지연됨', count: delayed, fill: '#EF4444' },
    { name: '완료됨', count: shipped, fill: '#10B981' }
  ];
  const hasData = data.some(item => item.count > 0);
  const maxCount = Math.max(...data.map(item => item.count), 1);

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50 h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-blue-600" />
              업무 대시보드
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {scope === 'all' ? `전체 업무 ${visibleTasks.length}건의 현황입니다.` : `${currentUser?.name || '나'}에게 배정된 업무 ${visibleTasks.length}건의 현황입니다.`}
            </p>
          </div>
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {(['all', 'mine'] as const).map(item => (
              <button
                key={item}
                onClick={() => setScope(item)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  scope === item ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                {item === 'all' ? '전체 업무' : '내 업무'}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> 대기중인 업무
            </div>
            <div className="text-3xl font-black text-gray-900">{pending}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm shadow-blue-50/50 flex flex-col justify-between">
            <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> 진행중인 업무
            </div>
            <div className="text-3xl font-black text-blue-600">{inProgress}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm shadow-red-50/50 flex flex-col justify-between">
            <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" /> 지연된 업무
            </div>
            <div className="text-3xl font-black text-red-600">{delayed}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm shadow-emerald-50/50 flex flex-col justify-between">
            <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" /> 완료된 업무
            </div>
            <div className="text-3xl font-black text-emerald-600">{shipped}</div>
          </div>
        </div>

        {/* Charts Widget */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            업무 분포 시각화
          </h2>
          <div className="h-[300px] w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 28, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    domain={[0, Math.max(1, Math.ceil(maxCount * 1.2))]}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F4F6' }}
                    formatter={(value) => [`${value}건`, '업무']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="count" position="top" fill="#374151" fontSize={12} fontWeight={700} formatter={(value) => `${Number(value)}건`} />
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                <CheckSquare className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-bold text-gray-500">표시할 업무가 없습니다.</p>
                <p className="mt-1 text-xs text-gray-400">업무가 생성되거나 배정되면 상태별 분포가 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
