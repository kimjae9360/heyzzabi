'use client';

import { useState, useEffect } from 'react';
import { Link2, GitPullRequest as GithubIcon, MessageSquare, Kanban, Calendar, Construction, CheckCircle2, ExternalLink, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

const PLANNED_INTEGRATIONS = [
  { id: 'slack', name: 'Slack', desc: '배분 승인, 지연 감지, 완료 알림을 지정 채널에 전송합니다.', icon: MessageSquare, color: 'purple' },
  { id: 'jira', name: 'Jira', desc: 'Hey Zzabi 파이프라인 Task를 Jira 이슈로 동기화합니다.', icon: Kanban, color: 'blue' },
  { id: 'gcal', name: 'Google Calendar', desc: '회의 일정에서 회의록을 생성하고 Action Item을 등록합니다.', icon: Calendar, color: 'green' },
];

interface Connection {
  provider: string;
  externalLogin: string;
  connectedAt: string;
  connectedBy: string;
}

export default function Integrations() {
  const { currentUser, setToast } = useAppStore();
  const isAdmin = currentUser?.level === 'pm';

  const [connections, setConnections] = useState<Connection[]>([]);
  const [githubConfigured, setGithubConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setConnections(data.connections);
      setGithubConfigured(data.githubConfigured);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const connected = params.get('connected');
    if (error) setToast(error, 'error');
    if (connected) setToast(`${connected} 연동이 완료되었습니다.`, 'success');
    if (error || connected) window.history.replaceState({}, '', '/integrations');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const github = connections.find(c => c.provider === 'github');

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/github/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      setToast('GitHub 연동이 해제되었습니다.', 'info');
      await loadConnections();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '연동 해제에 실패했습니다.', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="text-blue-600 w-5 h-5" /> 외부 툴 연동 (Integrations)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">GitHub는 실제 OAuth로 연동됩니다. 나머지는 아직 준비 중입니다.</p>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* GitHub - 실제 연동 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-gray-100 border-gray-200">
                <GithubIcon className="w-6 h-6 text-gray-800" />
              </div>
              <div>
                <div className="font-black text-gray-900 flex items-center gap-2">
                  GitHub
                  {github ? (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 연동됨
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">미연동</span>
                  )}
                </div>
                {github && <div className="text-xs text-gray-500 mt-0.5">@{github.externalLogin} · {github.connectedBy}님이 연동함</div>}
              </div>
            </div>
            {isAdmin && (
              github ? (
                <button onClick={handleDisconnect} disabled={disconnecting} className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> {disconnecting ? '해제 중...' : '연동 해제'}
                </button>
              ) : (
                <a href="/api/integrations/github/connect" className="px-3 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> GitHub로 연동하기
                </a>
              )
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">PR 생성, 브랜치 상태, 코드 리뷰를 파이프라인 업무와 연동합니다.</p>
          {!githubConfigured && !github && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                연동하려면 GitHub OAuth App을 만들고 <code className="bg-amber-100 px-1 rounded">.env</code>의 <code className="bg-amber-100 px-1 rounded">GITHUB_CLIENT_ID</code>/<code className="bg-amber-100 px-1 rounded">GITHUB_CLIENT_SECRET</code>을 채워야 합니다.
                Callback URL: <code className="bg-amber-100 px-1 rounded">{'{APP_URL}'}/api/integrations/github/callback</code>
              </p>
            </div>
          )}
          {!isAdmin && !github && <p className="mt-2 text-[11px] text-gray-400">연동 설정은 관리자만 가능합니다.</p>}
        </div>

        {/* 나머지 - 준비 중 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Construction className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>나머지는 준비 중인 기능입니다.</strong> 실제 OAuth 연동이 없는 상태에서 "연동됨"처럼 보이는 가짜 상태를 표시하지 않습니다.
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
        {loading && <p className="text-xs text-gray-400 text-center">연동 상태 확인 중...</p>}
      </div>
    </div>
  );
}
