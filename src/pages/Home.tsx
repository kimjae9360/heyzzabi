import { useAppStore } from '../store/useAppStore';
import { TrendingUp, Users, FileText, Activity, CheckCircle2, AlertTriangle, GitBranch, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { meetings, tasks, employees } = useAppStore();

  const pendingCount = tasks.filter(t => t.status === 'pending-distribution').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const delayedCount = tasks.filter(t => t.status === 'delayed').length;
  const shippedCount = tasks.filter(t => t.status === 'shipped').length;
  const totalHours = tasks.reduce((a, t) => a + (t.estimatedHours || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((shippedCount / tasks.length) * 100) : 0;
  const proposalsMade = meetings.filter(m => m.hasProposal).length;
  const overloadedEmps = employees.filter(e => e.currentWorkload > 80);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      {/* Welcome Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">안녕하세요, PM님 👋</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Hey Zzabi AI 파이프라인이 정상 가동 중입니다. 오늘의 현황을 확인하세요.</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-gray-400 font-medium">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600">AI Engine Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

        {/* Alert: Overloaded / Delayed */}
        {(delayedCount > 0 || overloadedEmps.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              {delayedCount > 0 && <span className="font-bold">⚠️ {delayedCount}건의 업무가 지연 중입니다. </span>}
              {overloadedEmps.length > 0 && <span className="font-bold">{overloadedEmps.map(e => e.name).join(', ')}님의 워크로드가 80%를 초과했습니다. </span>}
              <Link to="/pipeline" className="underline font-bold hover:text-amber-900">파이프라인에서 확인 →</Link>
            </div>
          </div>
        )}

        {/* Primary KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '전체 업무', value: `${tasks.length}건`, sub: `총 ${totalHours}h 예상`, icon: Briefcase2, color: 'blue', link: '/pipeline' },
            { label: '진행 중', value: `${inProgressCount}건`, sub: `${pendingCount}건 배분 대기`, icon: Activity, color: 'green', link: '/pipeline' },
            { label: '완료됨', value: `${shippedCount}건`, sub: `완료율 ${completionRate}%`, icon: CheckCircle2, color: 'gray', link: '/approvals' },
            { label: '등록 회의록', value: `${meetings.length}건`, sub: `${proposalsMade}건 기획서 생성됨`, icon: FileText, color: 'indigo', link: '/meetings' },
          ].map((card, i) => (
            <Link key={i} to={card.link} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group block">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{card.label}</p>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{card.value}</div>
              <div className="text-[11px] text-gray-400 font-medium">{card.sub}</div>
            </Link>
          ))}
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Team Workload */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> 팀원 워크로드
              </h3>
              <Link to="/settings" className="text-xs text-blue-600 font-bold hover:underline">관리 →</Link>
            </div>
            {employees.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">팀원을 등록하세요</p>
            ) : (
              <div className="space-y-4">
                {employees.map(emp => (
                  <div key={emp.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">{emp.avatar}</div>
                        <span className="text-sm font-bold text-gray-800">{emp.name}</span>
                        <span className="text-[10px] text-gray-400">{emp.role}</span>
                      </div>
                      <span className={`text-[11px] font-black ${emp.currentWorkload > 80 ? 'text-red-600' : emp.currentWorkload > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {emp.currentWorkload}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${emp.currentWorkload > 80 ? 'bg-red-500' : emp.currentWorkload > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${emp.currentWorkload}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Meetings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> 최근 회의록
              </h3>
              <Link to="/meetings" className="text-xs text-blue-600 font-bold hover:underline">전체보기 →</Link>
            </div>
            {meetings.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">등록된 회의록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 4).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.isTasksExtracted ? 'bg-emerald-500' : m.hasProposal ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.title}</p>
                      <p className="text-[10px] text-gray-400">{m.date}</p>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                      m.isTasksExtracted ? 'bg-emerald-100 text-emerald-700' :
                      m.hasProposal ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.isTasksExtracted ? '완료' : m.hasProposal ? '기획서↗' : '대기'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Status */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-500" /> 파이프라인 현황
              </h3>
              <Link to="/pipeline" className="text-xs text-blue-600 font-bold hover:underline">바로가기 →</Link>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Phase 1. 기획서 검토 대기', value: meetings.filter(m => m.hasProposal && !m.isTasksExtracted).length, color: 'bg-indigo-500' },
                { label: 'Phase 2. 배분 승인 대기', value: pendingCount, color: 'bg-amber-500' },
                { label: 'Phase 3. 진행 중 (지연 포함)', value: inProgressCount + delayedCount, color: 'bg-emerald-500' },
                { label: 'Phase 4. 완료됨', value: shippedCount, color: 'bg-gray-400' },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.color}`} />
                  <span className="text-xs text-gray-600 flex-1">{row.label}</span>
                  <span className="text-sm font-black text-gray-900 w-6 text-right">{row.value}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <div className="flex justify-between text-xs font-bold text-gray-500">
                  <span>전체 완료율</span>
                  <span className="text-emerald-600 font-black">{completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold mb-2">
              <TrendingUp className="w-4 h-4" />HEY ZZABI AI ENGINE · 4-Phase Pipeline
            </div>
            <h2 className="text-xl font-black mb-1">회의에서 배분까지, AI가 모든 인지적 노동을 대신합니다.</h2>
            <p className="text-blue-100 text-sm opacity-80 max-w-lg leading-relaxed">
              회의록 등록 → 기획서 자동 생성 → 팀원 부하 분석 → 스마트 배분까지. 지금 바로 시작하세요.
            </p>
          </div>
          <Link
            to="/meetings"
            className="shrink-0 px-6 py-3 bg-white text-blue-700 rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
          >
            <FileText className="w-4 h-4" /> 회의록 등록하기
          </Link>
        </div>
      </div>
    </div>
  );
}

function Briefcase2({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
