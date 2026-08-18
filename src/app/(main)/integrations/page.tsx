'use client';

import { useState, useEffect } from 'react';
import { Link2, GitPullRequest as GithubIcon, MessageSquare, ArrowRight, Zap, Loader2, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

interface SyncResult {
  completed: { taskTitle: string; projectTitle: string; prTitle: string; prNumber: number }[];
  errors: string[];
  checkedProjects: number;
}

export default function Integrations() {
  const { setToast, fetchData, projects, currentUser } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [slackConnected, setSlackConnected] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [slackWebhookInput, setSlackWebhookInput] = useState('');
  const [slackLinking, setSlackLinking] = useState(false);
  const [slackLinkError, setSlackLinkError] = useState('');

  const isAdmin = currentUser?.level === 'pm';

  useEffect(() => {
    const fetchSlackStatus = async () => {
      try {
        const res = await fetch('/api/integrations/slack');
        if (res.ok) {
          const data = await res.json();
          setSlackConnected(data.connected);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSlackStatus();
  }, []);

  const syncGithub = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/github/sync', { method: 'POST' });
      const data: SyncResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || 'GitHub 동기화에 실패했습니다.');

      if (data.checkedProjects === 0) {
        setToast('GitHub가 연동된 프로젝트가 없습니다. 연동하기 버튼을 눌러 프로젝트를 먼저 연동해 주세요.', 'warning');
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

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    const proj = projects.find(p => p.id === pid);
    if (proj && proj.githubOwner && proj.githubRepo) {
      setRepoUrlInput(`https://github.com/${proj.githubOwner}/${proj.githubRepo}`);
    } else {
      setRepoUrlInput('');
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !repoUrlInput.trim()) {
      setLinkError('프로젝트를 선택하고 저장소 주소를 입력해 주세요.');
      return;
    }
    setLinking(true);
    setLinkError('');
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrlInput.trim(), token: tokenInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'GitHub 저장소 연동에 실패했습니다.');
      
      setToast('GitHub 저장소가 성공적으로 연동되었습니다.', 'success');
      setShowLinkModal(false);
      setRepoUrlInput('');
      setTokenInput('');
      setSelectedProjectId('');
      await fetchData();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'GitHub 저장소 연동에 실패했습니다.');
    } finally {
      setLinking(false);
    }
  };

  const handleSlackLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slackWebhookInput.trim()) {
      setSlackLinkError('Webhook URL을 입력해 주세요.');
      return;
    }
    setSlackLinking(true);
    setSlackLinkError('');
    try {
      const res = await fetch(`/api/integrations/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: slackWebhookInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Slack 연동에 실패했습니다.');
      
      setToast('Slack이 성공적으로 연동되었습니다.', 'success');
      setShowSlackModal(false);
      setSlackWebhookInput('');
      setSlackConnected(true);
    } catch (err) {
      setSlackLinkError(err instanceof Error ? err.message : 'Slack 연동에 실패했습니다.');
    } finally {
      setSlackLinking(false);
    }
  };

  const handleSlackUnlink = async () => {
    if (!confirm('Slack 연동을 해제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/integrations/slack`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Slack 연동 해제에 실패했습니다.');
      setToast('Slack 연동이 해제되었습니다.', 'info');
      setSlackConnected(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Slack 연동 해제에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      {/* GitHub Linking Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Plus className="text-blue-600 w-5 h-5" />프로젝트에 GitHub 연동</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            {isAdmin ? (
              <form onSubmit={handleLink} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">대상 프로젝트 *</label>
                  <select 
                    value={selectedProjectId} 
                    onChange={handleProjectSelect} 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all"
                  >
                    <option value="" disabled>프로젝트를 선택하세요</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.githubOwner ? '(이미 연동됨)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">저장소 주소 *</label>
                  <input 
                    value={repoUrlInput} 
                    onChange={e => setRepoUrlInput(e.target.value)} 
                    placeholder="https://github.com/owner/repo" 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Personal Access Token (선택)</label>
                  <input 
                    value={tokenInput} 
                    onChange={e => setTokenInput(e.target.value)} 
                    type="password" 
                    placeholder="비공개 저장소일 때만 입력" 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">공개 저장소는 주소만 입력하면 됩니다. OAuth 앱 등록이나 서버 설정이 필요 없습니다.</p>
                </div>
                
                {linkError && <p className="text-[11px] text-red-600 mt-2">{linkError}</p>}
                
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                  <button type="submit" disabled={linking || !selectedProjectId || !repoUrlInput.trim()} className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm disabled:opacity-60">
                    {linking ? '연동 중...' : '연동'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">GitHub 연동은 관리자(PM)만 가능합니다.</p>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm">닫기</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slack Linking Modal */}
      {showSlackModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-gray-100">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Plus className="text-purple-600 w-5 h-5" />Slack 연동</h3>
              <button onClick={() => setShowSlackModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            {isAdmin ? (
              <form onSubmit={handleSlackLink} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Webhook URL *</label>
                  <input 
                    value={slackWebhookInput} 
                    onChange={e => setSlackWebhookInput(e.target.value)} 
                    placeholder="https://hooks.slack.com/services/..." 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-gray-50 focus:bg-white transition-all" 
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">Slack에서 생성한 Incoming Webhook URL을 입력하세요.</p>
                </div>
                
                {slackLinkError && <p className="text-[11px] text-red-600 mt-2">{slackLinkError}</p>}
                
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSlackModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                  <button type="submit" disabled={slackLinking || !slackWebhookInput.trim()} className="px-5 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-60">
                    {slackLinking ? '연동 중...' : '연동'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">Slack 연동은 관리자(PM)만 가능합니다.</p>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowSlackModal(false)} className="px-5 py-2.5 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-lg transition-colors shadow-sm">닫기</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="text-blue-600 w-5 h-5" /> 외부 툴 연동 (Integrations)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">업무 효율을 높이는 외부 툴을 연동하세요.</p>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* GitHub */}
          <button onClick={() => setShowLinkModal(true)} className="block w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group relative">
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-gray-100 border-gray-200 shrink-0">
                  <GithubIcon className="w-6 h-6 text-gray-800" />
                </div>
                <div>
                  <div className="font-black text-gray-900">GitHub</div>
                  <p className="text-sm text-gray-600 mt-0.5">저장소 주소만 입력하면 프로젝트별로 즉시 연동됩니다.</p>
                </div>
              </div>
              <div className="flex justify-end mt-auto">
                <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 group-hover:bg-blue-100 transition-colors">
                  연동하기 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </button>

          {/* Slack */}
          <div className="block w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-5 transition-all relative">
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-purple-50 border-purple-200 shrink-0">
                  <MessageSquare className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <div className="font-black text-gray-900 flex items-center gap-2">
                    Slack 
                    {slackConnected && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">연동됨</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">배분 승인, 지연 감지, 완료 알림을 전송합니다.</p>
                </div>
              </div>
              <div className="flex justify-end mt-auto">
                {slackConnected ? (
                  <button onClick={handleSlackUnlink} className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> 연동 해제
                  </button>
                ) : (
                  <button onClick={() => setShowSlackModal(true)} className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                    연동하기 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* GitHub PR 동기화 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-black text-blue-900 mb-1">
              <Zap className="w-5 h-5 text-blue-600" /> GitHub PR 동기화
            </div>
            <p className="text-sm text-blue-800">
              PR 제목이나 본문에 업무의 고유 ID(예: <strong>TASK-A1B2C3</strong>)가 포함되어 있으면, PR의 최신 상태를 업무와 연동하고 완료 처리합니다.
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
      </div>
    </div>
  );
}
