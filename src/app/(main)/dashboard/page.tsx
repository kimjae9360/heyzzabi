'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BarChart2, CheckCircle2, Clock, FileText, GitBranch, TrendingUp, Users, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

function weekLabel(date: Date) {
  return `${date.getMonth() + 1}/W${Math.ceil(date.getDate() / 7)}`;
}

function buildWeeklyTrend(
  meetings: { meetingDateIso: string; hasProposal: boolean }[],
  tasks: { completedAtIso?: string }[],
) {
  const now = new Date();
  const data = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (5 - index) * 7);
    return { week: weekLabel(date), meetings: 0, proposals: 0, shipped: 0 };
  });
  const bucket = (iso: string) => {
    const weeksAgo = Math.floor((now.getTime() - new Date(iso).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = 5 - weeksAgo;
    return index >= 0 && index < 6 ? index : null;
  };

  meetings.forEach((meeting) => {
    const index = bucket(meeting.meetingDateIso);
    if (index === null) return;
    data[index].meetings += 1;
    if (meeting.hasProposal) data[index].proposals += 1;
  });
  tasks.forEach((task) => {
    if (!task.completedAtIso) return;
    const index = bucket(task.completedAtIso);
    if (index !== null) data[index].shipped += 1;
  });
  return data;
}

export default function DashboardPage() {
  const { tasks = [], employees = [], meetings = [], notifications = [] } = useAppStore();

  const totalTasks = tasks.length;
  const pending = tasks.filter((task) => task.status === 'pending-distribution').length;
  const inProgress = tasks.filter((task) => task.status === 'in-progress').length;
  const delayed = tasks.filter((task) => task.status === 'delayed').length;
  const shipped = tasks.filter((task) => task.status === 'shipped').length;
  const meetingsWithProposal = meetings.filter((meeting) => meeting.hasProposal || meeting.isTasksExtracted).length;
  const meetingsConverted = meetings.filter((meeting) => meeting.isTasksExtracted).length;
  const rate = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

  const completionRate = rate(shipped, totalTasks);
  const delayRate = rate(delayed, totalTasks);
  const proposalRate = rate(meetingsWithProposal, meetings.length);
  const taskRate = rate(meetingsConverted, meetingsWithProposal);
  const funnel = [
    { label: '회의', value: meetings.length, color: '#6366f1' },
    { label: '기획서 생성', value: meetingsWithProposal, color: '#3b82f6' },
    { label: '업무 추출', value: meetingsConverted, color: '#10b981' },
    { label: '업무 완료', value: shipped, color: '#059669' },
  ];
  const statusData = [
    { name: '배분 대기', value: pending, color: '#f59e0b' },
    { name: '진행 중', value: inProgress, color: '#3b82f6' },
    { name: '지연', value: delayed, color: '#ef4444' },
    { name: '완료', value: shipped, color: '#10b981' },
  ].filter((item) => item.value > 0);
  const workloadData = employees.map((employee) => ({
    name: employee.name,
    workload: employee.currentWorkload,
    tasks: tasks.filter((task) => task.assigneeId === employee.id).length,
  }));
  const trendData = buildWeeklyTrend(meetings, tasks);
  const recentActivity = notifications.slice(0, 6);

  const cards = [
    { label: '전체 업무', value: totalTasks, detail: `진행 중 ${inProgress}건`, icon: GitBranch, tone: 'blue', href: '/pipeline' },
    { label: '지연 감지', value: delayed, detail: `전체의 ${delayRate}%`, icon: AlertTriangle, tone: delayed ? 'red' : 'gray', href: '/pipeline' },
    { label: '완료율', value: `${completionRate}%`, detail: `${shipped}건 완료`, icon: CheckCircle2, tone: 'emerald', href: '/approvals' },
    { label: '승인 대기', value: pending, detail: '배분 미완료', icon: Clock, tone: pending ? 'amber' : 'gray', href: '/approvals' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <BarChart2 className="h-5 w-5 text-blue-600" /> 통합 대시보드
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">파이프라인 전환율, 팀 워크로드와 지연 현황을 한눈에 확인합니다.</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Activity className="h-3.5 w-3.5" /> 실제 업무 데이터 연동
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-5 p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className={cn(
              'group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
              card.tone === 'red' ? 'border-red-200' : card.tone === 'amber' ? 'border-amber-200' :
              card.tone === 'emerald' ? 'border-emerald-100' : card.tone === 'blue' ? 'border-blue-100' : 'border-gray-200',
            )}>
              <div className="mb-2 flex items-start justify-between">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  card.tone === 'red' ? 'bg-red-50 text-red-500' : card.tone === 'amber' ? 'bg-amber-50 text-amber-500' :
                  card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-500' : card.tone === 'blue' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400',
                )}>
                  <card.icon className="h-4.5 w-4.5" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
              </div>
              <div className="text-2xl font-black text-gray-900">{card.value}</div>
              <div className="mt-0.5 text-[10px] font-bold text-gray-500">{card.label}</div>
              <div className="mt-0.5 text-[9px] text-gray-400">{card.detail}</div>
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><TrendingUp className="h-4 w-4 text-blue-600" /> 파이프라인 전환 퍼널</h2>
              <span className="text-[10px] font-bold text-gray-400">회의 → 기획서 → 업무 → 완료</span>
            </div>
            <div className="space-y-3">
              {funnel.map((stage, index) => {
                const totalPercent = rate(stage.value, meetings.length);
                const stepPercent = index > 0 ? rate(stage.value, funnel[index - 1].value) : null;
                return (
                  <div key={stage.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-gray-700"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{stage.label}</span>
                      <span className="flex items-center gap-3">
                        {stepPercent !== null && <b className={cn('rounded px-1.5 py-0.5 text-[9px]', stepPercent >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>단계 전환 {stepPercent}%</b>}
                        <strong>{stage.value}건</strong><span className="w-8 text-right text-gray-400">{totalPercent}%</span>
                      </span>
                    </div>
                    <div className="h-8 overflow-hidden rounded-lg bg-gray-100"><div className="h-full rounded-lg transition-all" style={{ width: `${stage.value ? Math.max(totalPercent, 5) : 0}%`, backgroundColor: `${stage.color}99` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[['회의 → 기획서', proposalRate], ['기획서 → 업무', taskRate], ['전체 완료율', completionRate]].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center"><div className="text-lg font-black text-blue-700">{value}%</div><div className="text-[9px] font-bold text-gray-500">{label}</div></div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-900">업무 상태 분포</h2>
            {statusData.length ? <>
              <ResponsiveContainer width="100%" height={170}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={40}>{statusData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${Number(value)}건`, '업무']} /></PieChart></ResponsiveContainer>
              <div className="space-y-1.5">{statusData.map((item) => <div key={item.name} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-gray-600"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.value}건</strong></div>)}</div>
            </> : <div className="flex h-52 flex-col items-center justify-center text-xs text-gray-400"><GitBranch className="mb-2 h-10 w-10 opacity-20" /><p>파이프라인에 업무가 없습니다.</p><Link href="/meetings" className="font-bold text-blue-500">회의록 등록하기 →</Link></div>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-blue-600" /> 팀원별 워크로드</h2>
            {workloadData.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={workloadData} barSize={28}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} /><Tooltip formatter={(value) => [`${Number(value)}%`, '워크로드']} /><Bar dataKey="workload" radius={[4, 4, 0, 0]}>{workloadData.map((item) => <Cell key={item.name} fill={item.workload > 80 ? '#ef4444' : item.workload > 60 ? '#f59e0b' : '#10b981'} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex h-52 items-center justify-center text-sm text-gray-400">등록된 팀원이 없습니다.</div>}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-indigo-600" /> 최근 6주 파이프라인 추이</h2>
            <ResponsiveContainer width="100%" height={220}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} /><Line type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={2} name="회의록" /><Line type="monotone" dataKey="proposals" stroke="#3b82f6" strokeWidth={2} name="기획서" /><Line type="monotone" dataKey="shipped" stroke="#10b981" strokeWidth={2} name="완료" /></LineChart></ResponsiveContainer>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-blue-600" /> 최근 활동 로그</h2><span className="text-[9px] text-gray-400">{recentActivity.filter((item) => !item.read).length}개 미확인</span></div>
            <div className="divide-y">{recentActivity.length ? recentActivity.map((item) => <Link key={item.id} href={item.link || '/dashboard'} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50"><i className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.type === 'success' ? 'bg-emerald-500' : item.type === 'warning' ? 'bg-amber-500' : item.type === 'error' ? 'bg-red-500' : 'bg-blue-500')} /><div><p className={cn('text-xs', item.read ? 'text-gray-500' : 'font-bold text-gray-900')}>{item.message}</p><p className="text-[9px] text-gray-400">{item.timestamp}</p></div></Link>) : <div className="py-10 text-center text-sm text-gray-400">활동 기록이 없습니다.</div>}</div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-5 py-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4 text-amber-500" /> 빠른 실행</h2></div>
            <div className="space-y-2 p-4">{[
              ['새 회의록 등록', '/meetings', FileText, 'bg-blue-50 text-blue-700'],
              ['파이프라인 보기', '/pipeline', GitBranch, 'bg-indigo-50 text-indigo-700'],
              ['배분 승인 처리', '/approvals', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
              ['AI 리서치 실행', '/research', TrendingUp, 'bg-gray-50 text-gray-700'],
            ].map(([label, href, Icon, color]) => <Link key={String(label)} href={String(href)} className={cn('group flex items-center gap-2.5 rounded-xl border border-gray-100 p-3 text-xs font-bold', String(color))}><Icon className="h-4 w-4" />{String(label)}<ArrowRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100" /></Link>)}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
