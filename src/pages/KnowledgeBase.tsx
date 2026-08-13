import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

import { Network, Search, Filter } from 'lucide-react';

const mockGraphData = {
  nodes: [
    { id: 'Hey Zzabi', group: 1, val: 20 },
    { id: 'AI 에이전트', group: 1, val: 15 },
    { id: '회의록 요약', group: 2, val: 10 },
    { id: '업무 자동 배분', group: 2, val: 10 },
    { id: 'PPT 생성기', group: 3, val: 12 },
    { id: 'Deep Research', group: 3, val: 12 },
    { id: '지식 그래프', group: 4, val: 8 },
    { id: 'B2B SaaS', group: 1, val: 15 },
    { id: 'Agent-Reach', group: 3, val: 8 },
    { id: '결재 시스템', group: 2, val: 8 },
  ],
  links: [
    { source: 'Hey Zzabi', target: 'AI 에이전트' },
    { source: 'Hey Zzabi', target: 'B2B SaaS' },
    { source: 'Hey Zzabi', target: '회의록 요약' },
    { source: 'Hey Zzabi', target: '업무 자동 배분' },
    { source: 'Hey Zzabi', target: 'PPT 생성기' },
    { source: 'AI 에이전트', target: 'Deep Research' },
    { source: 'AI 에이전트', target: '지식 그래프' },
    { source: 'Deep Research', target: 'Agent-Reach' },
    { source: '업무 자동 배분', target: '결재 시스템' },
  ]
};

export default function KnowledgeBase() {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    // Auto zoom to fit on load
    setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 500);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 border-b border-gray-200 bg-white z-10 shadow-sm relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">사내 지식망 (Knowledge Graph)</h1>
              <p className="text-xs text-gray-500">AI가 분석한 회의록, 기획서, 업무 내역이 시맨틱하게 연결된 지식 지도입니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="지식 노드 검색..." 
                className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
              />
            </div>
            <button className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
              <Filter className="w-4 h-4" /> 필터
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={mockGraphData}
          nodeLabel="id"
          nodeColor={node => {
            const groupColors = ['#9CA3AF', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
            return groupColors[(node.group as number) % groupColors.length];
          }}
          nodeRelSize={6}
          linkColor={() => '#E5E7EB'}
          linkWidth={2}
          onNodeClick={node => {
            if (fgRef.current) {
              fgRef.current.centerAt(node.x, node.y, 1000);
              fgRef.current.zoom(8, 2000);
            }
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id as string;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              (node.x || 0) - bckgDimensions[0] / 2,
              (node.y || 0) - bckgDimensions[1] / 2,
              bckgDimensions[0],
              bckgDimensions[1]
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const groupColors = ['#9CA3AF', '#2563EB', '#059669', '#7C3AED', '#D97706'];
            ctx.fillStyle = groupColors[(node.group as number) % groupColors.length];
            
            ctx.fillText(label, node.x || 0, node.y || 0);

            (node as any).__bckgDimensions = bckgDimensions;
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            const bckgDimensions = (node as any).__bckgDimensions;
            bckgDimensions && ctx.fillRect(
              (node.x || 0) - bckgDimensions[0] / 2,
              (node.y || 0) - bckgDimensions[1] / 2,
              bckgDimensions[0],
              bckgDimensions[1]
            );
          }}
        />
        
        <div className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2 z-10 pointer-events-none">
          <h4 className="text-xs font-bold text-gray-900 mb-1">범례 (Legend)</h4>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="text-[10px] text-gray-600">코어 엔진 (Core)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-600"></div><span className="text-[10px] text-gray-600">업무 자동화 (Automation)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-600"></div><span className="text-[10px] text-gray-600">리서치/생성 (Generative)</span></div>
        </div>
      </div>
    </div>
  );
}
