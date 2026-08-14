'use client';

import Link from 'next/link';
import { Link2, GitPullRequest as GithubIcon, MessageSquare, Kanban, Calendar, Construction, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANNED_INTEGRATIONS = [
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
        <p className="text-gray-500 text-xs mt-0.5">GitHub는 프로젝트별로 연동합니다. 나머지는 아직 준비 중입니다.</p>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* GitHub - 프로젝트별 연동으로 이동 */}
        <Link href="/projects" className="block bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
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
              프로젝트에서 연동하기 <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        {/* 나머지 - 준비 중 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Construction className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>나머지는 준비 중인 기능입니다.</strong> 실제 연동이 없는 상태에서 "연동됨"처럼 보이는 가짜 상태를 표시하지 않습니다.
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
