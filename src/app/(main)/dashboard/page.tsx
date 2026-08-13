'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, LineChart, Line, Legend } from 'recharts';
import { BarChart2, GitBranch, Users, FileText, CheckCircle2, AlertTriangle, TrendingUp, Clock, ArrowRight, Activity, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

function weekLabel(date: Date) {
  return `${date.getMonth() + 1}/W${Math.ceil(date.getDate() / 7)}`;
}

function buildWeeklyTrend(meetings: { meetingDateIso: string; hasProposal: boolean }[], tasks: { completedAtIso?: string }[]) {
  const weeks: { start: Date; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7);
    weeks.push({ start, label: weekLabel(start) });
  }
  const bucketIndex = (iso: string) => {
    const d = new Date(iso);
    const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000));
    const idx = 5 - diffWeeks;
    return idx >= 0 && idx < 6 ? idx : null;
  };
  const counts = weeks.map(w => ({ week: w.label, meetings: 0, proposals: 0, shipped: 0 }));
  meetings.forEach(m => {
    const idx = bucketIndex(m.meetingDateIso);
    if (idx !== null) {
      counts[idx].meetings += 1;
      if (m.hasProposal) counts[idx].proposals += 1;
    }
  });
  tasks.forEach(t => {
    if (!t.completedAtIso) return;
    const idx = bucketIndex(t.completedAtIso);
    if (idx !== null) counts[idx].shipped += 1;
  });
  return counts;
}

export default function Dashboard() {
  const { tasks = [], employees = [], meetings = [], notifications = [] } = useAppStore();
  const trendData = buildWeeklyTrend(meetings, tasks);

  const totalTasks = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending-distribution').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const shipped = tasks.filter(t => t.status === 'shipped').length;

  const totalMeetings = meetings.length;
  const meetingsWithProposal = meetings.filter(m => m.hasProposal || m.isTasksExtracted).length;
  const meetingsConverted = meetings.filter(m => m.isTasksExtracted).length;

  const proposalConvRate = totalMeetings > 0 ? Math.round((meetingsWithProposal / totalMeetings) * 100) : 0;
  const taskConvRate = meetingsWithProposal > 0 ? Math.round((meetingsConverted / meetingsWithProposal) * 100) : 0;
  const completionRate = totalTasks > 0 ? Math.round((shipped / totalTasks) * 100) : 0;
  const delayRate = totalTasks > 0 ? Math.round((delayed / totalTasks) * 100) : 0;

  const pipelineStatusData = [
    { name: '배분 대기', value: pending, color: '#f59e0b' },
    { name: '진행 중', value: inProgress, color: '#3b82f6' },
    { name: '지연', value: delayed, color: '#ef4444' },
    { name: '완료', value: shipped, color: '#10b981' },
  ].filter(d => d.value > 0);

  const workloadData = employees.map(emp => ({
    name: emp.name,
    workload: emp.currentWorkload,
    tasks: tasks.filter(t => t.assigneeId === emp.id).length,
  }));

  const funnelData = [
    { stage: '회의', count: totalMeetings, color: '#6366f1' },
    { stage: '기획서 생성', count: meetingsWithProposal, color: '#3b82f6' },
    { stage: '업무 추출', count: meetingsConverted, color: '#10b981' },
    { stage: '업무 완료', count: shipped, color: '#059669' },
  ];

  const recentActivity = notifications.slice(0, 6);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="text-blue-600 w-5 h-5" /> 통합 대시보드 (홈)
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">파이프라인 전환율, 팀 워크로드, 지연 현황을 실시간으로 확인합니다.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> 실시간 연동
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto w-full space-y-5">

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '전체 업무', value: totalTasks, sub: `진행 중 ${inProgress}`, icon: GitBranch, color: 'blue', link: '/pipeline' },
            { label: '지연 감지', value: delayed, sub: `전체의 ${delayRate}%`, icon: AlertTriangle, color: delayed > 0 ? 'red' : 'gray', link: '/pipeline' },
            { label: '완료율', value: `${completionRate}%`, sub: `${shipped}개 완료됨`, icon: CheckCircle2, color: 'emerald', link: '/approvals' },
            { label: '승인 대기', value: pending, sub: '배분 미완료', icon: Clock, color: pending > 0 ? 'amber' : 'gray', link: '/approvals' },
          ].map((k, i) => (
            <Link key={i} href={k.link} className={cn(
              "bg-white p-4 rounded-2xl shadow-sm border transition-all hover:shadow-md group",
              k.color === 'red' && delayed > 0 ? "border-red-200" :
              k.color === 'amber' && pending > 0 ? "border-amber-200" :
              k.color === 'emerald' ? "border-emerald-100" :
              k.color === 'blue' ? "border-blue-100" : "border-gray-200"
            )}>
              <div className="flex items-start justify-between mb-2">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
                  k.color === 'red' ? "bg-red-50" : k.color === 'amber' ? "bg-amber-50" :
                  k.color === 'emerald' ? "bg-emerald-50" : k.color === 'blue' ? "bg-blue-50" : "bg-gray-50"
                )}>
                  <k.icon className={cn("w-4.5 h-4.5",
                    k.color === 'red' ? "text-red-500" : k.color === 'amber' ? "text-amber-500" :
                    k.color === 'emerald' ? "text-emerald-500" : k.color === 'blue' ? "text-blue-500" : "text-gray-400"
                  )} />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <div className="text-2xl font-black text-gray-900">{k.value}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-0.5">{k.label}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">{k.sub}</div>
            </Link>
          ))}
        </div>

        {/* Pipeline Funnel + Conversion Rates */}
        <div className="grid grid-cols-3 gap-4">
          {/* Funnel Chart */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> 파이프라인 전환 퍼널
              </h3>
              <div className="text-[10px] font-bold text-gray-400">회의록 → 완료 전환 추적</div>
            </div>
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const pct = funnelData[0].count > 0 ? Math.round((stage.count / funnelData[0].count) * 100) : 0;
                const prevPct = i > 0 && funnelData[i - 1].count > 0
                  ? Math.round((stage.count / funnelData[i - 1].count) * 100) : null;
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 font-bold text-gray-700">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.stage}
                      </div>
                      <div className="flex items-center gap-3">
                        {prevPct !== null && (
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded", prevPct >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                            전환율 {prevPct}%
                          </span>
                        )}
                        <span className="font-black text-gray-900">{stage.count}건</span>
                        <span className="text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg transition-all duration-700 flex items-center px-3"
                        style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: stage.color + '40', border: `1px solid ${stage.color}60` }}>
                        <div className="h-full absolute left-0 top-0 rounded-lg opacity-60" style={{ width: '100%', backgroundColor: stage.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: '회의 → 기획서', value: `${proposalConvRate}%`, color: proposalConvRate >= 70 ? 'emerald' : 'amber' },
                { label: '기획서 → 업무 배분', value: `${taskConvRate}%`, color: taskConvRate >= 70 ? 'emerald' : 'amber' },
                { label: '전체 완료율', value: `${completionRate}%`, color: completionRate >= 60 ? 'emerald' : 'red' },
              ].map((c, i) => (
                <div key={i} className={cn("px-3 py-2.5 rounded-xl border text-center",
                  c.color === 'emerald' ? "bg-emerald-50 border-emerald-200" :
                  c.color === 'red' ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                )}>
                  <div className={cn("text-lg font-black",
                    c.color === 'emerald' ? "text-emerald-700" : c.color === 'red' ? "text-red-700" : "text-amber-700"
                  )}>{c.value}</div>
                  <div className="text-[9px] font-bold text-gray-500 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Status Pie */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
              업무 상태 분포
            </h3>
            {pipelineStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <RePieChart>
                    <Pie data={pipelineStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={40}>
                      {pipelineStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}건`, '']} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pipelineStatusData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 font-medium text-gray-600">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <span className="font-black text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs text-center">
                <div>
                  <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>파이프라인에 업무가 없습니다.</p>
                  <Link href="/meetings" className="text-blue-500 font-bold hover:underline text-[10px]">회의록 등록하기 →</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workload + Trend */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team Workload */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> 팀원별 워크로드
            </h3>
            {workloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workloadData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: any) => [`${v}%`, '워크로드']} />
                  <Bar dataKey="workload" radius={[4, 4, 0, 0]}>
                    {workloadData.map((entry, i) => (
                      <Cell key={i} fill={entry.workload > 80 ? '#ef4444' : entry.workload > 60 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">팀원이 없습니다.</div>}
          </div>

          {/* Weekly Trend */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> 주차별 파이프라인 트렌드
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={2} dot={false} name="회의록" />
                <Line type="monotone" dataKey="proposals" stroke="#3b82f6" strokeWidth={2} dot={false} name="기획서" />
                <Line type="monotone" dataKey="shipped" stroke="#10b981" strokeWidth={2} dot={false} name="완료" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity + Quick Access */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> 최근 활동 로그
              </h3>
              <span className="text-[9px] font-bold text-gray-400">{recentActivity.filter(a => !a.read).length}개 미확인</span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentActivity.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">활동 기록이 없습니다.</div>
              ) : recentActivity.map(n => (
                <Link key={n.id} href={n.link || '/dashboard'} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                    n.type === 'success' ? "bg-emerald-500" :
                    n.type === 'warning' ? "bg-amber-500" :
                    n.type === 'error' ? "bg-red-500" : "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-snug line-clamp-2", !n.read ? "font-bold text-gray-900" : "text-gray-500")}>{n.message}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{n.timestamp}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> 빠른 실행
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: '+ 새 회의록 등록', link: '/meetings', icon: FileText, color: 'blue' },
                { label: '파이프라인 보기', link: '/pipeline', icon: GitBranch, color: 'indigo' },
                { label: '배분 승인 처리', link: '/approvals', icon: CheckCircle2, color: 'emerald' },
                { label: '외부 연동 관리', link: '/integrations', icon: TrendingUp, color: 'gray' },
              ].map((item, i) => (
                <Link key={i} href={item.link} className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl transition-all group font-bold text-xs",
                  item.color === 'blue' ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100" :
                  item.color === 'indigo' ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100" :
                  item.color === 'emerald' ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100" :
                  "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100"
                )}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}