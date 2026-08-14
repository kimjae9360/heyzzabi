'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Search, CheckCircle2, AlertCircle, Clock, AlertTriangle, ChevronUp, ChevronDown, Sparkles, Settings } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type SortKey = 'title' | 'status' | 'estimatedHours' | 'difficulty';
type FilterStatus = 'all' | 'pending-distribution' | 'in-progress' | 'delayed' | 'shipped';

export default function Tasks() {
  const { tasks, employees, updateTaskProgress, splitTaskByAi, projects = [], fetchProjects } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  useEffect(() => {
    fetchProjects?.();
    const projectParam = new URLSearchParams(window.location.search).get('project');
    if (projectParam) setSelectedProjectId(projectParam);
  }, [fetchProjects]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let result = tasks;
    if (selectedProjectId !== 'all') {
      result = result.filter(t => t.projectId === selectedProjectId);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.source.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    const statusOrder: Record<string, number> = { 'delayed': 0, 'pending-distribution': 1, 'in-progress': 2, 'shipped': 3 };
    result = [...result].sort((a, b) => {
      let v = 0;
      if (sortKey === 'status') v = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      else if (sortKey === 'estimatedHours') v = (a.estimatedHours || 0) - (b.estimatedHours || 0);
      else if (sortKey === 'difficulty') {
        const dord: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
        v = (dord[a.difficulty || 'Low'] ?? 2) - (dord[b.difficulty || 'Low'] ?? 2);
      } else {
        v = a.title.localeCompare(b.title);
      }
      return sortAsc ? v : -v;
    });
    return result;
  }, [tasks, query, filterStatus, sortKey, sortAsc, selectedProjectId]);

  const statusCounts = {
    all: filtered.length,
    'pending-distribution': filtered.filter(t => t.status === 'pending-distribution').length,
    'in-progress': filtered.filter(t => t.status === 'in-progress').length,
    delayed: filtered.filter(t => t.status === 'delayed').length,
    shipped: filtered.filter(t => t.status === 'shipped').length,
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortAsc ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />)
    : <ChevronUp className="w-3 h-3 text-gray-300" />;

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="text-blue-600 w-6 h-6" />
              업무 현황판 (Task Board)
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">파이프라인에서 배분된 전체 업무의 세부 상태를 조회하고 진행률을 관리합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer shadow-sm"
              >
                <option value="all">전체 프로젝트 보기</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              {selectedProjectId !== 'all' && (
                <Link
                  href={`/projects/${selectedProjectId}`}
                  title="프로젝트 설정 (GitHub 연동 등)"
                  className="flex items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg w-9 h-9 hover:bg-gray-100 hover:text-gray-700 transition-colors shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="업무명, 소스 회의록 검색..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          {([
            { key: 'all', label: '전체' },
            { key: 'delayed', label: '⚠️ 지연' },
            { key: 'pending-distribution', label: '배분 대기' },
            { key: 'in-progress', label: '진행 중' },
            { key: 'shipped', label: '완료' },
          ] as { key: FilterStatus; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                filterStatus === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[11px] font-black",
                filterStatus === tab.key ? "bg-white/20 text-white" : "bg-white text-gray-700"
              )}>
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1 text-center">상태</div>
            <button className="col-span-4 text-left flex items-center gap-1 hover:text-gray-800 transition-colors" onClick={() => handleSort('title')}>
              업무명 <SortIcon k="title" />
            </button>
            <div className="col-span-3">소스 (회의록)</div>
            <div className="col-span-2 text-center">담당자</div>
            <button className="col-span-1 text-center flex items-center justify-center gap-1 hover:text-gray-800 transition-colors" onClick={() => handleSort('estimatedHours')}>
              시간 <SortIcon k="estimatedHours" />
            </button>
            <div className="col-span-1 text-center">진행률</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">
                  {tasks.length === 0
                    ? '생성된 업무가 없습니다. 회의분석 탭에서 회의록을 등록하고 기획서를 생성해 보세요.'
                    : `"${query || filterStatus}"에 해당하는 업무가 없습니다.`}
                </p>
              </div>
            ) : (
              filtered.map(t => {
                const assignee = employees.find(e => e.id === t.assigneeId);
                const isDelayed = t.status === 'delayed';
                const isPending = t.status === 'pending-distribution';
                const isShipped = t.status === 'shipped';
                const isInProgress = t.status === 'in-progress';

                return (
                  <div key={t.id} className={cn(
                    "grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-gray-50 transition-colors",
                    isDelayed && "bg-red-50/40"
                  )}>
                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <span className={cn(
                        "px-2 py-1 text-[11px] font-black rounded-md text-center whitespace-nowrap",
                        isPending ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        isInProgress ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                        isDelayed ? "bg-red-100 text-red-700 border border-red-200" :
                        "bg-gray-100 text-gray-500 border border-gray-200"
                      )}>
                        {isPending ? '대기 중' : isInProgress ? '진행 중' : isDelayed ? '지연됨' : '완료'}
                      </span>
                    </div>

                    {/* Task Info */}
                    <div className="col-span-4">
                      <div className={cn("font-bold text-sm", isShipped ? "text-gray-400 line-through" : "text-gray-900")}>
                        {isDelayed && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-500" />}
                        {t.title}
                      </div>
                      {t.delayReason && (
                        <div className="text-[12px] text-red-600 mt-0.5 font-medium">사유: {t.delayReason}</div>
                      )}
                      <div className="text-[12px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span
                          title={t.difficulty ? (t.difficultyReason || '난이도 판단 근거가 기록되지 않은 업무입니다.') : undefined}
                          className={cn(
                            "px-1.5 py-0.5 rounded font-bold",
                            t.difficulty && "cursor-help",
                            t.difficulty === 'High' ? "text-red-600 bg-red-50" :
                            t.difficulty === 'Medium' ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-100"
                          )}>
                          {t.difficulty || '-'}
                        </span>
                        {t.completedAt && <span className="text-gray-400">완료: {t.completedAt}</span>}
                        {(isPending || isInProgress) && (
                          <button
                            onClick={() => splitTaskByAi(t.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-100 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> AI로 쪼개기
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Source */}
                    <div title={t.source} className="col-span-3 text-xs text-gray-500 truncate font-medium">{t.source}</div>

                    {/* Assignee */}
                    <div className="col-span-2 flex justify-center">
                      {assignee ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-black">{assignee.avatar}</div>
                          <span className="text-[11px] font-bold text-gray-700">{assignee.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600 text-[12px] font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <AlertCircle className="w-3 h-3" /> 미배정
                        </div>
                      )}
                    </div>

                    {/* Hours */}
                    <div className="col-span-1 flex items-center justify-center gap-1 text-xs text-gray-600 font-bold">
                      <Clock className="w-3 h-3 text-gray-400" /> {t.estimatedHours || '?'}h
                    </div>

                    {/* Progress */}
                    <div className="col-span-1 flex flex-col items-center gap-1">
                      {isShipped ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <>
                          <span className="text-[12px] font-black text-gray-700">{t.progress || 0}%</span>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", isDelayed ? "bg-red-400" : "bg-blue-500")}
                              style={{ width: `${t.progress || 0}%` }}
                            />
                          </div>
                          {isInProgress && (
                            <div className="w-full mt-1">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={t.progress || 0}
                                onChange={e => updateTaskProgress(t.id, Number(e.target.value))}
                                className="w-full h-2.5 cursor-pointer accent-blue-600"
                                title="드래그해서 진행률 조정"
                              />
                              <div className="text-center text-[12px] font-bold text-blue-400 leading-none mt-0.5">드래그하여 조정</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 text-xs text-gray-400 text-center">
            총 {filtered.length}건 / 전체 {tasks.length}건 표시 중
          </div>
        )}
      </div>
    </div>
  );
}