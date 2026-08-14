'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, GitBranch, GitPullRequest, CircleDot, ExternalLink, Loader2, X, RefreshCw, Mic2, ListChecks, ArrowRight, CalendarClock, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface ProjectDetail {
  id: string; title: string; description?: string; status: string; priority: string;
  targetDueDate?: string;
  githubOwner?: string; githubRepo?: string; githubLinkedAt?: string;
  meetings: { id: string; title: string; date: string }[];
  tasks: { id: string; title: string; status: string }[];
}

interface GithubActivity {
  repoFullName: string; repoUrl: string;
  commits: { sha: string; message: string; author: string; date: string; url: string }[];
  pullRequests: { number: number; title: string; state: string; author: string; url: string; updatedAt: string }[];
  issues: { number: number; title: string; state: string; author: string; url: string; updatedAt: string }[];
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.level === 'pm';

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activity, setActivity] = useState<GithubActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [savingDueDate, setSavingDueDate] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) { setNotFound(true); return; }
      const data: ProjectDetail = await res.json();
      setProject(data);
      setDueDateInput(data.targetDueDate ? data.targetDueDate.slice(0, 10) : '');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSaveDueDate = async () => {
    setSavingDueDate(true);
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDueDate: dueDateInput || null }),
      });
      await loadProject();
    } finally {
      setSavingDueDate(false);
    }
  };

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const res = await fetch(`/api/projects/${id}/github/activity`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'GitHub 활동 내역을 불러오지 못했습니다.');
      setActivity(data);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'GitHub 활동 내역을 불러오지 못했습니다.');
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => {
    if (project?.githubOwner && project?.githubRepo) loadActivity();
  }, [project?.githubOwner, project?.githubRepo, loadActivity]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) return;
    setLinking(true);
    setLinkError('');
    try {
      const res = await fetch(`/api/projects/${id}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrlInput.trim(), token: tokenInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'GitHub 저장소 연동에 실패했습니다.');
      setRepoUrlInput(''); setTokenInput('');
      await loadProject();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'GitHub 저장소 연동에 실패했습니다.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('이 프로젝트의 GitHub 연동을 해제하시겠습니까?')) return;
    await fetch(`/api/projects/${id}/github`, { method: 'DELETE' });
    setActivity(null);
    await loadProject();
  };

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (notFound || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <p>프로젝트를 찾을 수 없습니다.</p>
        <Link href="/pipeline" className="text-blue-600 font-bold text-sm hover:underline">업무관리로 →</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <Link href="/pipeline" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" />업무관리로</Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{project.title}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{project.description || '설명이 없습니다.'}</p>
          </div>
          <Link href={`/pipeline?project=${project.id}`} className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
            업무관리에서 보기 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Target Due Date */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-black text-gray-900 flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4 text-gray-700" />목표 마감일</h3>
          <p className="text-xs text-gray-500 mb-3">이 프로젝트가 언제까지 진행되어야 하는지를 나타내며, 업무관리 파이프라인의 D-day 표시와 향후 WBS 일정의 기준이 됩니다.</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dueDateInput}
              onChange={e => setDueDateInput(e.target.value)}
              disabled={!isAdmin}
              className="border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {isAdmin && (
              <button
                onClick={handleSaveDueDate}
                disabled={savingDueDate || dueDateInput === (project.targetDueDate ? project.targetDueDate.slice(0, 10) : '')}
                className="px-3 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {savingDueDate ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
          {!isAdmin && <p className="text-[10px] text-gray-400 mt-2">마감일 설정은 관리자만 가능합니다.</p>}
        </div>

        {/* GitHub */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-black text-gray-900 flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4 text-gray-700" />GitHub 연동</h3>
          {project.githubOwner && project.githubRepo ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <a href={`https://github.com/${project.githubOwner}/${project.githubRepo}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 hover:underline flex items-center gap-1">
                  {project.githubOwner}/{project.githubRepo} <ExternalLink className="w-3 h-3" />
                </a>
                <div className="flex items-center gap-2">
                  <button onClick={loadActivity} disabled={activityLoading} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><RefreshCw className={activityLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /></button>
                  {isAdmin && <button onClick={handleUnlink} className="px-2.5 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1"><X className="w-3 h-3" />연동 해제</button>}
                </div>
              </div>
              {activityError && <p className="text-[11px] text-red-600 mb-2">{activityError}</p>}
              {activity && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">최근 커밋</div>
                    <div className="space-y-1.5">
                      {activity.commits.slice(0, 5).map(c => (
                        <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" className="block p-2 rounded-lg bg-gray-50 hover:bg-blue-50 truncate" title={c.message}>
                          <span className="font-mono text-[9px] text-gray-400">{c.sha}</span> {c.message}
                        </a>
                      ))}
                      {activity.commits.length === 0 && <p className="text-gray-400">커밋 없음</p>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><GitPullRequest className="w-3 h-3" />PR</div>
                    <div className="space-y-1.5">
                      {activity.pullRequests.slice(0, 5).map(pr => (
                        <a key={pr.number} href={pr.url} target="_blank" rel="noreferrer" className="block p-2 rounded-lg bg-gray-50 hover:bg-blue-50 truncate" title={pr.title}>
                          #{pr.number} {pr.title} <span className="text-[9px] text-gray-400">({pr.state})</span>
                        </a>
                      ))}
                      {activity.pullRequests.length === 0 && <p className="text-gray-400">PR 없음</p>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1"><CircleDot className="w-3 h-3" />이슈</div>
                    <div className="space-y-1.5">
                      {activity.issues.slice(0, 5).map(i => (
                        <a key={i.number} href={i.url} target="_blank" rel="noreferrer" className="block p-2 rounded-lg bg-gray-50 hover:bg-blue-50 truncate" title={i.title}>
                          #{i.number} {i.title} <span className="text-[9px] text-gray-400">({i.state})</span>
                        </a>
                      ))}
                      {activity.issues.length === 0 && <p className="text-gray-400">이슈 없음</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            <form onSubmit={handleLink} className="space-y-2">
              <input value={repoUrlInput} onChange={e => setRepoUrlInput(e.target.value)} placeholder="https://github.com/owner/repo" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white" />
              <input value={tokenInput} onChange={e => setTokenInput(e.target.value)} type="password" placeholder="Personal Access Token (비공개 저장소일 때만 입력, 선택)" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white" />
              <button type="submit" disabled={linking} className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg disabled:opacity-60">{linking ? '연동 중...' : '연동'}</button>
              <p className="text-[10px] text-gray-400">공개 저장소는 주소만 입력하면 됩니다. OAuth 앱 등록이나 서버 설정이 필요 없습니다.</p>
            </form>
          ) : (
            <p className="text-xs text-gray-400">연동된 저장소가 없습니다. (등록은 관리자만 가능합니다)</p>
          )}
          {linkError && <p className="text-[11px] text-red-600 mt-2">{linkError}</p>}
        </div>

        {/* Meetings & Tasks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-black text-gray-900 mb-3 text-sm flex items-center gap-1.5"><Mic2 className="w-4 h-4 text-gray-400" />연결된 회의록 ({project.meetings.length})</h3>
            <div className="space-y-1.5">
              {project.meetings.slice(0, 8).map(m => <div key={m.id} className="text-xs text-gray-700 p-2 rounded-lg bg-gray-50 flex justify-between"><span className="truncate" title={m.title}>{m.title}</span><span className="text-gray-400 shrink-0 ml-2">{m.date}</span></div>)}
              {project.meetings.length === 0 && <p className="text-xs text-gray-400">연결된 회의록이 없습니다.</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-black text-gray-900 mb-3 text-sm flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-gray-400" />연결된 업무 ({project.tasks.length})</h3>
            <div className="space-y-1.5">
              {project.tasks.slice(0, 8).map(t => <div key={t.id} className="text-xs text-gray-700 p-2 rounded-lg bg-gray-50 flex justify-between"><span className="truncate" title={t.title}>{t.title}</span><span className="text-gray-400 shrink-0 ml-2">{t.status}</span></div>)}
              {project.tasks.length === 0 && <p className="text-xs text-gray-400">연결된 업무가 없습니다.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
