'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link2, GitPullRequest as GithubIcon, MessageSquare, Kanban, Calendar, Construction, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

const PLANNED_INTEGRATIONS = [
  { id: 'slack', name: 'Slack', desc: '배분 승인, 지연 감지, 완료 알림을 지정 채널에 전송합니다.', icon: MessageSquare, color: 'purple' },
  { id: 'jira', name: 'Jira', desc: 'Hey Zzabi 파이프라인 Task를 Jira 이슈로 동기화합니다.', icon: Kanban, color: 'blue' },
  { id: 'gcal', name: 'Google Calendar', desc: '회의 일정에서 회의록을 생성하고 Action Item을 등록합니다.', icon: Calendar, color: 'green' },
];

interface SyncResult {
  completed: { taskTitle: string; projectTitle: string; prTitle: string; prNumber: number }[];
  errors: string[];
  checkedProjects: number;
}

export default function Integrations() {
  const { setToast, fetchData } = useAppStore();
  const [syncing, setSyncing] = useState(false);

  const syncGithub = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/github/sync', { method: 'POST' });
      const data: SyncResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || 'GitHub 동기화에 실패했습니다.');

      if (data.checkedProjects === 0) {
        setToast('GitHub가 연동된 프로젝트가 없습니다. 업무관리에서 프로젝트를 먼저 연동해 주세요.', 'warning');
      } else if (data.completed.length > 0) {
        const first = data.completed[0];
        const rest = data.completed.length - 1;
        setToast(`PR #${first.prNumber} 병합 확인 → "${first.taskTitle}" 완료 처리${rest > 0 ? ` 외 ${rest}건` : ''}`, 'success');
      } else if (data.errors.length > 0) {
        setToast(data.errors[0], 'error');
      } else {
        setToast('연동된 저장소를 확인했지만, 병합된 PR과 일치하는 진행 중인 업무가 없습니다.', 'info');
      }
      await fetchData();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'GitHub 동기화에 실패했습니다.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="text-blue-600 w-5 h-5" /> 외부 툴 연동 (Integrations)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">GitHub는 프로젝트별로 연동합니다. 나머지는 아직 준비 중입니다.</p>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* GitHub - 프로젝트별 연동으로 이동 */}
        <Link href="/pipeline" className="block bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-gray-100 border-gray-200">
                <GithubIcon className="w-6 h-6 text-gray-800" />
              </div>
              <div>
                <div className="font-black text-gray-900">GitHub</div>
                <p className="text-sm text-gray-600 mt-0.5">저장소 주소만 입력하면 프로젝트별로 즉시 연동됩니다. OAuth 앱 등록이나 서버 설정이 필요 없습니다.</p>
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              업무관리에서 프로젝트 선택 후 연동하기 <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* GitHub PR 동기화 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-black text-blue-900 mb-1">
              <Zap className="w-5 h-5 text-blue-600" /> GitHub PR 동기화
            </div>
            <p className="text-sm text-blue-800">
              연동된 프로젝트들의 GitHub 저장소에서 <strong>실제로 병합된 PR</strong>을 조회해, 제목이 일치하는 진행 중인 업무를 완료 처리합니다.
            </p>
          </div>
          <button
            onClick={syncGithub}
            disabled={syncing}
            className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-60"
          >
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> 동기화 중...</> : <><Zap className="w-4 h-4" /> 지금 동기화</>}
          </button>
        </div>

        {/* 나머지 - 준비 중 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Construction className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>아래는 준비 중인 기능입니다.</strong> 실제 연동이 없는 상태에서 "연동됨"처럼 보이는 가짜 상태를 표시하지 않습니다.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {PLANNED_INTEGRATIONS.map(integration => (
            <div key={integration.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 opacity-80">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border",
                  integration.color === 'purple' ? "bg-purple-100 border-purple-200" :
                  integration.color === 'blue' ? "bg-blue-100 border-blue-200" : "bg-green-100 border-green-200"
                )}>
                  <integration.icon className={cn("w-6 h-6",
                    integration.color === 'purple' ? "text-purple-700" :
                    integration.color === 'blue' ? "text-blue-700" : "text-green-700"
                  )} />
                </div>
                <div>
                  <div className="font-black text-gray-900">{integration.name}</div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">연동 예정</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{integration.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
