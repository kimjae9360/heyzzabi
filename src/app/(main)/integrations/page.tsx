'use client';

import { Link2, GitPullRequest as GithubIcon, MessageSquare, Kanban, Calendar, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANNED_INTEGRATIONS = [
  { id: 'github', name: 'GitHub', desc: 'PR 생성, 브랜치 상태, 코드 리뷰를 파이프라인 업무와 연동합니다.', icon: GithubIcon, color: 'gray' },
  { id: 'slack', name: 'Slack', desc: '배분 승인, 지연 감지, 완료 알림을 지정 채널에 전송합니다.', icon: MessageSquare, color: 'purple' },
  { id: 'jira', name: 'Jira', desc: 'Hey Zzabi 파이프라인 Task를 Jira 이슈로 동기화합니다.', icon: Kanban, color: 'blue' },
  { id: 'gcal', name: 'Google Calendar', desc: '회의 일정에서 회의록을 생성하고 Action Item을 등록합니다.', icon: Calendar, color: 'green' },
];

export default function Integrations() {
  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="text-blue-600 w-5 h-5" /> 외부 툴 연동 (Integrations)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">GitHub, Slack, Jira 등 외부 서비스 연동은 아직 실제 OAuth가 연결되지 않았습니다.</p>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Construction className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>준비 중인 기능입니다.</strong> 실제 OAuth 연동이 없는 상태에서 "연동됨"처럼 보이는 가짜 상태를 표시하지 않습니다.
            아래는 연동 예정 목록이며, 실제 연동이 붙으면 각 카드에 연결 버튼이 활성화됩니다.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {PLANNED_INTEGRATIONS.map(integration => (
            <div key={integration.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 opacity-80">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border",
                  integration.color === 'gray' ? "bg-gray-100 border-gray-200" :
                  integration.color === 'purple' ? "bg-purple-100 border-purple-200" :
                  integration.color === 'blue' ? "bg-blue-100 border-blue-200" : "bg-green-100 border-green-200"
                )}>
                  <integration.icon className={cn("w-6 h-6",
                    integration.color === 'gray' ? "text-gray-800" :
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
