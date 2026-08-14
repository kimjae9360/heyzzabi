'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Network, Search, RefreshCw, Send, FileText, FileSignature, Loader2, AlertCircle, MessageSquarePlus, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { sourceType: string; sourceId: string; title: string; category: string | null; score: number }[];
}

interface GraphData {
  nodes: { id: string; label: string; group: number }[];
  links: { source: string; target: string }[];
}

const GROUP_COLORS = ['#9CA3AF', '#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
const GROUP_LABELS: Record<number, string> = { 1: '프로젝트', 2: '회의록', 3: '기획서', 4: '업무', 5: '담당자', 6: '주제 분류 (AI 자동 태깅)' };

export default function KnowledgeBase() {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.level === 'pm';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [graphLoading, setGraphLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ zoomToFit: (ms: number, padding: number) => void } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const loadGraph = useCallback(async () => {
    setGraphLoading(true);
    try {
      const res = await fetch('/api/knowledge/graph');
      const data = await res.json();
      setGraph(data);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/knowledge/chat');
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
    loadHistory();
  }, [loadGraph, loadHistory]);

  // 채팅 앱들이 다 그렇듯 히스토리를 열면 가장 오래된 메시지가 아니라 최신 메시지가 보여야 한다.
  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = chatScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (!historyLoading) scrollToLatest();
  }, [historyLoading, scrollToLatest]);

  useEffect(() => {
    if (messages.length > 0 || asking) scrollToLatest('smooth');
  }, [messages.length, asking, scrollToLatest]);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 120);
  };

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', update);
    update();
    const t = setTimeout(() => fgRef.current?.zoomToFit(400, 40), 400);
    return () => { window.removeEventListener('resize', update); clearTimeout(t); };
  }, [graph]);

  const handleAsk = async () => {
    if (!query.trim() || asking) return;
    const q = query.trim();
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuery('');
    setAsking(true);
    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '질의에 실패했습니다.');
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : '질의에 실패했습니다.' }]);
    } finally {
      setAsking(false);
    }
  };

  const handleNewChat = async () => {
    if (messages.length === 0) return;
    if (!window.confirm('이전 대화 내역을 모두 지우고 새로 시작하시겠습니까?')) return;
    await fetch('/api/knowledge/chat', { method: 'DELETE' });
    setMessages([]);
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await fetch('/api/knowledge/reindex', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '재인덱싱에 실패했습니다.');
      await loadGraph();
      setMessages(prev => [...prev, { role: 'assistant', content: `재인덱싱 완료: 회의록/기획서 ${data.indexed}건을 임베딩했습니다.` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: err instanceof Error ? err.message : '재인덱싱에 실패했습니다.' }]);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f4f5f7]">
      <div className="p-6 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">챗봇</h1>
              <p className="text-xs text-gray-500">회의록/기획서를 임베딩 검색하고 근거 기반으로 질의응답합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" /> 새 대화
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleReindex}
                disabled={reindexing}
                className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={cn("w-4 h-4", reindexing && "animate-spin")} /> {reindexing ? '인덱싱 중...' : '전체 재인덱싱'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <div className="w-[420px] shrink-0 border-r border-gray-200 bg-white flex flex-col relative">
          <div ref={chatScrollRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
            {historyLoading ? (
              <div className="text-center text-gray-400 text-sm mt-10">
                <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin opacity-40" />
                이전 대화를 불러오는 중...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-10 px-4">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>회의록/기획서 내용에 대해 자연어로 질문해 보세요.</p>
                <p className="text-xs mt-2 text-gray-300">예: "인증 버그 대응 회의에서 뭘 결정했어?"</p>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={cn("max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === 'user' ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-800")}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    {m.sources.map((s, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        {s.sourceType === 'MEETING' ? <FileText className="w-3 h-3" /> : <FileSignature className="w-3 h-3" />}
                        <span title={s.title} className="truncate">{s.title}</span>
                        {s.category && <span className="shrink-0 bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">{s.category}</span>}
                        <span className="ml-auto shrink-0 font-bold">{Math.round(s.score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {asking && (
              <div className="bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-500 flex items-center gap-2 max-w-[90%]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 검색 및 답변 생성 중...
              </div>
            )}
          </div>
          {showJumpToLatest && (
            <button
              onClick={() => scrollToLatest('smooth')}
              className="absolute bottom-20 right-4 flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-full shadow-lg transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" /> 최신 메시지로
            </button>
          )}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="질문을 입력하세요..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white"
            />
            <button onClick={handleAsk} disabled={asking || !query.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graph */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          {graphLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">그래프를 불러오는 중...</div>
          ) : graph.nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center px-6">
              <div>
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>표시할 데이터가 없습니다. 회의록을 등록하고 기획서를 생성해 보세요.</p>
              </div>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef as never}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graph}
              nodeLabel="label"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeColor={(node: any) => GROUP_COLORS[node.group] || '#999'}
              nodeRelSize={5}
              linkColor={() => '#E5E7EB'}
              linkWidth={1.5}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const fontSize = 11 / globalScale;
                ctx.font = `${fontSize}px sans-serif`;
                ctx.fillStyle = GROUP_COLORS[node.group] || '#999';
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, 4, 0, 2 * Math.PI);
                ctx.fill();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#374151';
                const label = node.label.length > 20 ? node.label.slice(0, 20) + '…' : node.label;
                ctx.fillText(label, node.x || 0, (node.y || 0) + 6);
              }}
            />
          )}
          <div className="absolute bottom-6 right-6 bg-white p-3 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-1.5 z-10 pointer-events-none">
            <h4 className="text-[10px] font-bold text-gray-900 mb-0.5">범례</h4>
            {Object.entries(GROUP_LABELS).map(([g, label]) => (
              <div key={g} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[Number(g)] }} />
                <span className="text-[9px] text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
