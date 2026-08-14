'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Mic2, Briefcase, Link2, Settings, Bell, X, BrainCircuit, CheckSquare, Search, GitBranch, FileText, Clock, Network, Users, ListChecks, ChevronDown, LogOut, Microscope, Loader2, Sparkles, CornerDownLeft, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type Employee } from '@/store/useAppStore';
import AiSidePanel from './AiSidePanel';

const globalNavItems: { name: string; path: string; icon: typeof Home; minLevel?: Employee['level'] }[] = [
  { name: '홈', path: '/dashboard', icon: Home },
  { name: '회의분석', path: '/meetings', icon: Mic2 },
  { name: '업무관리', path: '/pipeline', icon: Briefcase },
  { name: '업무보드', path: '/tasks', icon: ListChecks },
  { name: '결재함', path: '/approvals', icon: CheckSquare, minLevel: 'lead' },
  { name: '직원관리', path: '/employees', icon: Users, minLevel: 'pm' },
  { name: '챗봇', path: '/knowledge', icon: Network },
  { name: 'AI 리서치', path: '/research', icon: Microscope },
  { name: '연동', path: '/integrations', icon: Link2 },
  { name: '설정', path: '/settings', icon: Settings },
];

const LEVEL_RANK: Record<Employee['level'], number> = { member: 0, lead: 1, pm: 2 };
const LEVEL_LABEL: Record<Employee['level'], string> = { member: '직원', lead: '팀장', pm: '관리자' };

export default function Layout({ children }: { children: React.ReactNode }) {
  const { toast, clearToast, notifications = [], markAllNotificationsRead, tasks = [], meetings = [], fetchData, currentUser, fetchCurrentUser, logout, isAiPanelOpen, toggleAiPanel } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aiAskedQuery, setAiAskedQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSources, setAiSources] = useState<{ sourceType: string; sourceId: string; title: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const isComposingRef = useRef(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingApprovals = tasks.filter(t => t.status === 'pending-distribution').length;
  const activeLevel = currentUser?.level ?? 'member';

  const visibleNavItems = globalNavItems.filter(item => !item.minLevel || LEVEL_RANK[activeLevel] >= LEVEL_RANK[item.minLevel]);

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
  }, [fetchCurrentUser, fetchData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => clearToast(), 4500);
      return () => clearTimeout(t);
    }
  }, [toast, clearToast]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchFocused(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results
  const searchResults = searchQuery.trim().length >= 2 ? [
    ...meetings.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.summary.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
      .slice(0, 3).map(m => ({ type: '회의록', label: m.title, sub: `${m.summary.length}개 안건`, link: '/meetings', icon: FileText })),
    ...tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.source.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3).map(t => ({ type: '업무', label: t.title, sub: `출처: ${t.source}`, link: '/pipeline', icon: GitBranch })),
  ] : [];

  const handleSearchResultClick = (link: string) => {
    router.push(link);
    setSearchQuery('');
    setAiAskedQuery('');
    setAiAnswer('');
    setAiError('');
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAiAskedQuery('');
    setAiAnswer('');
    setAiError('');
  };

  const handleAskAi = async () => {
    const q = searchQuery.trim();
    if (q.length < 2 || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiAnswer('');
    try {
      const res = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '질의에 실패했습니다.');
      setAiAskedQuery(q);
      setAiAnswer(data.answer);
      setAiSources(data.sources || []);
    } catch (err) {
      setAiAskedQuery(q);
      setAiError(err instanceof Error ? err.message : '질의에 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full text-gray-900 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="font-black text-lg tracking-tighter flex items-center gap-2 shrink-0">
            <div className="bg-blue-600 text-white rounded-lg px-2 py-1 text-sm font-black tracking-normal shadow-sm">Zz</div>
            <span className="text-gray-900">헤이 짜비</span>
            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">BETA</span>
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative hidden md:block">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              isSearchFocused ? "bg-white border-blue-400 shadow-md w-[520px]" : "bg-gray-100 border-transparent w-[420px]"
            )}>
              <BrainCircuit className={cn("w-4 h-4 shrink-0", isSearchFocused ? "text-blue-500" : "text-gray-400")} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => { isComposingRef.current = false; }}
                onKeyUp={e => {
                  // 한글 IME 입력 중 Enter를 누르면 그 Enter가 조합 확정(compositionend)에 먼저
                  // 소비되어 keydown이 아예 안 오는 브라우저가 있다 - 사용자가 Enter를 눌러도
                  // 검색이 안 되는 것처럼 보이는 원인. keyup은 조합이 끝난 뒤 안정적으로 오므로
                  // keydown 대신 keyup에서 처리하고, 조합 중 Enter는 한 번 더 걸러낸다.
                  if (e.key !== 'Enter' || isComposingRef.current || e.nativeEvent.isComposing) return;
                  handleAskAi();
                }}
                placeholder='자연어 질의: "김개발 업무량은?", "인증 버그 회의록 찾아줘" (Enter로 AI 질의)'
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
              />
              {searchQuery && (
                <button onClick={handleClearSearch} className="text-gray-400 hover:text-gray-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-h-[440px] overflow-y-auto">
                {searchQuery.length >= 2 ? (
                  <div>
                    {/* AI natural-language answer (OpenAI, real DB data — triggered on Enter) */}
                    {aiAskedQuery === searchQuery.trim() && (aiLoading || aiAnswer || aiError) ? (
                      <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1.5">
                          <Sparkles className="w-3 h-3" /> AI 답변
                        </div>
                        {aiLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />사내 데이터를 분석해 답변을 생성하는 중...
                          </div>
                        ) : aiError ? (
                          <p className="text-sm text-red-600">{aiError}</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-800 leading-relaxed">{aiAnswer}</p>
                            {aiSources.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {aiSources.map((s, i) => (
                                  <span key={i} className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                    {s.sourceType === 'MEETING' ? '회의록' : '기획서'}: {s.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleAskAi}
                        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 hover:bg-blue-50 transition-colors text-left"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="flex-1 text-xs text-gray-600">
                          &ldquo;<b className="text-gray-900">{searchQuery}</b>&rdquo; AI에게 물어보기
                        </span>
                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
                          <CornerDownLeft className="w-2.5 h-2.5" />Enter
                        </span>
                      </button>
                    )}

                    {searchResults.length > 0 && (
                      <div>
                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          제목 일치 결과 ({searchResults.length}건)
                        </div>
                        {searchResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleSearchResultClick(r.link)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <r.icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div title={r.label} className="text-sm font-bold text-gray-900 truncate">{r.label}</div>
                              <div className="text-[10px] text-gray-400">{r.sub}</div>
                            </div>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">{r.type}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.length === 0 && !aiAnswer && !aiLoading && !aiError && (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>제목이 일치하는 결과가 없습니다. Enter를 눌러 AI에게 물어보세요.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">빠른 이동</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '파이프라인 보기', link: '/pipeline', icon: GitBranch },
                        { label: '회의록 등록', link: '/meetings', icon: Mic2 },
                        { label: '업무 현황', link: '/approvals', icon: CheckSquare },
                        { label: '통계 대시보드', link: '/dashboard', icon: Home },
                      ].map((q, i) => (
                        <button key={i} onClick={() => handleSearchResultClick(q.link)} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left text-sm font-medium text-gray-700">
                          <q.icon className="w-4 h-4 text-gray-400" />
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setIsNotifOpen(v => !v); }}
              className={cn("relative p-2 rounded-lg transition-all", isNotifOpen ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100")}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-black px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-600" />
                    <span className="font-bold text-gray-900 text-sm">알림</span>
                    {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}개 미확인</span>}
                  </div>
                  <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    모두 읽음
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">새로운 알림이 없습니다.</div>
                  ) : notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => { if (n.link) router.push(n.link); setIsNotifOpen(false); }}
                      className={cn("w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left", !n.read && "bg-blue-50/50")}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        n.type === 'success' ? "bg-emerald-500" :
                        n.type === 'warning' ? "bg-amber-500" :
                        n.type === 'error' ? "bg-red-500" : "bg-blue-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", !n.read ? "font-bold text-gray-900" : "font-medium text-gray-600")}>{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{n.timestamp}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* User Badge */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen(v => !v)}
              className="flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <div className="text-gray-900 font-bold text-xs leading-tight">{currentUser?.name || '...'}</div>
                <div className="text-gray-400 text-[9px]">{LEVEL_LABEL[activeLevel]} · {currentUser?.role || '-'}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                {currentUser?.avatar || '?'}
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="text-sm font-bold text-gray-900">{currentUser?.name}</div>
                  <div className="text-[10px] text-gray-400">{currentUser?.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors text-left text-sm font-bold"
                >
                  <LogOut className="w-4 h-4" /> 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[68px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center pt-3 pb-4 gap-0.5 z-10">
          {visibleNavItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            const badge = item.name === '결재함' ? pendingApprovals : 0;
            return (
              <Link
                key={item.path}
                href={item.path}
                title={item.name}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 w-[56px] h-[52px] rounded-xl transition-all",
                  isActive ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-blue-600 rounded-r-full" />}
                <item.icon className={cn("w-[18px] h-[18px]", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
                <span className="text-[8px] font-bold tracking-tight">{item.name}</span>
                {badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center font-black px-0.5">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Toast */}
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
              <div className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-semibold min-w-[300px] max-w-[520px]",
                toast.type === 'success' ? "bg-emerald-600 border-emerald-700 text-white" :
                toast.type === 'warning' ? "bg-amber-500 border-amber-600 text-white" :
                toast.type === 'error' ? "bg-red-600 border-red-700 text-white" :
                "bg-gray-900 border-gray-800 text-white"
              )}>
                <Bell className="w-4 h-4 shrink-0" />
                <span className="flex-1">{toast.message}</span>
                <button onClick={clearToast} className="opacity-70 hover:opacity-100 transition-opacity ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {children}
        </main>
        
        {/* AI Side Panel */}
        <AiSidePanel />
      </div>

      {/* AI 비서 플로팅 버튼 */}
      <button
        onClick={toggleAiPanel}
        title={isAiPanelOpen ? 'AI 비서 닫기' : 'AI 비서에게 물어보기'}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all",
          isAiPanelOpen
            ? "bg-gray-900 text-white hover:bg-black"
            : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
        )}
      >
        {isAiPanelOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </div>
  );
}
