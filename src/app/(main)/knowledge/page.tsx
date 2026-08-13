'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Network, Search, RefreshCw, Send, FileText, FileSignature, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { sourceType: string; sourceId: string; title: string; score: number }[];
}

interface GraphData {
  nodes: { id: string; label: string; group: number }[];
  links: { source: string; target: string }[];
}

const GROUP_COLORS = ['#9CA3AF', '#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];
const GROUP_LABELS: Record<number, string> = { 1: '프로젝트', 2: '회의록', 3: '기획서', 4: '업무', 5: '담당자' };

export default function KnowledgeBase() {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.level === 'pm';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [graphLoading, setGraphLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ zoomToFit: (ms: number, padding: number) => void } | null>(null);

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

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

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
              <h1 className="text-xl font-bold text-gray-900">사내 지식망 (Knowledge Base)</h1>
              <p className="text-xs text-gray-500">회의록/기획서를 임베딩 검색하고 근거 기반으로 질의응답합니다.</p>
            </div>
          </div>
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

      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <div className="w-[420px] shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
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
                        <span className="truncate">{s.title}</span>
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
