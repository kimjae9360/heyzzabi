'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { BrainCircuit, Filter, User, CheckSquare, FileText, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type NodeType = 'project' | 'employee' | 'task' | 'meeting';

interface GraphNode {
  id: string;
  name: string;
  val: number;
  type: NodeType;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  color?: string;
}

export default function KnowledgeGraphPage() {
  const { projects, employees, tasks, meetings } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<NodeType | 'all'>('all');
  const fgRef = useRef<any>();

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add Projects
    projects.forEach(p => {
      nodes.push({ id: `proj-${p.id}`, name: p.title, val: 30, type: 'project', color: '#8b5cf6' });
    });

    // Add Employees
    employees.forEach(e => {
      nodes.push({ id: `emp-${e.id}`, name: e.name, val: 25, type: 'employee', color: '#10b981' });
    });

    // Add Tasks
    tasks.forEach(t => {
      nodes.push({ id: `task-${t.id}`, name: t.title, val: 15, type: 'task', color: '#3b82f6' });
      if (t.projectId) {
        links.push({ source: `task-${t.id}`, target: `proj-${t.projectId}`, color: '#e5e7eb' });
      }
      if (t.assigneeId) {
        links.push({ source: `task-${t.id}`, target: `emp-${t.assigneeId}`, color: '#bfdbfe' });
      }
    });

    // Add Meetings
    meetings.forEach(m => {
      nodes.push({ id: `meet-${m.id}`, name: m.title, val: 20, type: 'meeting', color: '#f59e0b' });
      if (m.projectId) {
        links.push({ source: `meet-${m.id}`, target: `proj-${m.projectId}`, color: '#e5e7eb' });
      }
    });

    return {
      nodes: activeFilter === 'all' ? nodes : nodes.filter(n => n.type === activeFilter || links.some(l => (l.source === n.id || l.target === n.id) && nodes.find(nn => nn.id === (l.source === n.id ? l.target : l.source))?.type === activeFilter)),
      links
    };
  }, [projects, employees, tasks, meetings, activeFilter]);

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm shrink-0 flex items-center justify-between z-10 relative">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="text-blue-600 w-6 h-6" />
            지식 그래프
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">프로젝트, 담당자, 업무, 회의록 간의 연관 관계를 시각적으로 탐색합니다.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <Filter className="w-4 h-4 text-gray-400 mx-2" />
          {(['all', 'project', 'employee', 'task', 'meeting'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
                activeFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {f === 'all' && '전체 보기'}
              {f === 'project' && <><Folder className="w-3.5 h-3.5 text-purple-500"/> 프로젝트</>}
              {f === 'employee' && <><User className="w-3.5 h-3.5 text-emerald-500"/> 직원</>}
              {f === 'task' && <><CheckSquare className="w-3.5 h-3.5 text-blue-500"/> 업무</>}
              {f === 'meeting' && <><FileText className="w-3.5 h-3.5 text-amber-500"/> 회의록</>}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-5">
          <BrainCircuit className="w-96 h-96" />
        </div>
        
        {typeof window !== 'undefined' && (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={4}
            linkColor="color"
            linkWidth={1.5}
            onNodeClick={handleNodeClick}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}
      </div>
    </div>
  );
}
