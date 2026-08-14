'use client';

import { useState } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { GitBranch, CheckCircle2, AlertCircle, User, ChevronRight, Activity, FileSignature, BrainCircuit, X, AlertTriangle, Mic, Download } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, type TaskUiStatus, type Employee } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { recommendAssignee, scoreCandidate, type AssignmentScore } from '@/lib/taskAssignment';

interface RejectModal { type: 'proposal' | 'distribution'; id: string; title: string; }
interface DelayModal { id: string; title: string; }
interface DropConfirm { taskId: string; title: string; employee: Employee; scoreInfo: AssignmentScore; }

function toCandidate(e: Employee) {
  return { id: e.id, name: e.name, role: e.role, level: e.level, skills: e.skills, pastProjects: e.pastProjects, currentWorkload: e.currentWorkload };
}

function recommend(title: string, employees: Employee[]) {
  return recommendAssignee({ title }, employees.map(toCandidate));
}

function formatDueLabel(dueDateIso: string): string {
  const diffHours = (new Date(dueDateIso).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours < 0) return `⏰ 목표 완료 시각 ${Math.round(-diffHours)}시간 초과`;
  if (diffHours < 24) return `목표: ${Math.round(diffHours)}시간 후`;
  return `목표: ${Math.round(diffHours / 24)}일 후`;
}

// plane 스타일: 카드는 드래그 가능, 컬럼은 드롭 영역. 허용 안 된 이동은 토스트로 막고 스냅백한다.
function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      {children}
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex-1 overflow-y-auto space-y-3 pb-4 rounded-lg transition-colors", isOver && "bg-blue-50/60 ring-2 ring-blue-300 ring-inset")}>
      {children}
    </div>
  );
}

export default function Pipeline() {
  const { meetings = [], tasks = [], employees = [], generateProposal, downloadPPT, approveProposalAndExtractTasks, approveDistribution, rejectProposal, rejectDistribution, reportDelay, reallocateTask, updateTaskStatus } = useAppStore();

  const [rejectModal, setRejectModal] = useState<RejectModal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [manualAssignees, setManualAssignees] = useState<Record<string, string>>({});
  const [delayModal, setDelayModal] = useState<DelayModal | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [dropConfirm, setDropConfirm] = useState<DropConfirm | null>(null);

  const meetingsRaw = meetings.filter(m => !m.hasProposal);
  const meetingsWaiting = meetings.filter(m => m.hasProposal && !m.isTasksExtracted);
  const pendingTasks = tasks.filter(t => t.status === 'pending-distribution');
  const activeTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'delayed');
  const shippedTasks = tasks.filter(t => t.status === 'shipped');

  const handleGenerateProposal = (id: string) => {
    generateProposal(id);
  };

  const handleExtractTasks = (id: string) => {
    approveProposalAndExtractTasks(id);
  };

  const handleRejectProposal = (id: string, title: string) => {
    setRejectModal({ type: 'proposal', id, title });
    setRejectReason('');
  };

  const handleApproveDistribution = (t: { id: string; title: string }) => {
    if (employees.length === 0) return;
    const recommendedEmp = employees.find(e => e.id === recommend(t.title, employees)?.employeeId);
    const selectedEmpId = manualAssignees[t.id] || recommendedEmp?.id;
    const bestEmp = employees.find(e => e.id === selectedEmpId) || recommendedEmp || employees[0];

    approveDistribution(t.id, bestEmp.id);

    setManualAssignees(prev => {
      const next = { ...prev };
      delete next[t.id];
      return next;
    });
  };

  const handleRejectDistribution = (id: string, title: string) => {
    setRejectModal({ type: 'distribution', id, title });
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectModal || !rejectReason.trim()) return;
    if (rejectModal.type === 'proposal') {
      rejectProposal(rejectModal.id, rejectReason.trim());
    } else {
      rejectDistribution(rejectModal.id, rejectReason.trim());
    }
    setRejectModal(null);
    setRejectReason('');
  };

  const handleOpenDelayModal = (t: { id: string; title: string }) => {
    setDelayModal({ id: t.id, title: t.title });
    setDelayReason('');
  };

  const handleConfirmDelay = () => {
    if (!delayModal || !delayReason.trim()) return;
    reportDelay(delayModal.id, delayReason.trim());
    setDelayModal(null);
    setDelayReason('');
  };

  const handleReallocate = (t: { id: string; title: string }) => {
    reallocateTask(t.id);
  };

  const handleCompleteTask = (id: string) => {
    updateTaskStatus(id, 'shipped');
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const COLUMN_FOR_STATUS: Record<TaskUiStatus, string> = {
    'pending-distribution': 'col-distribution',
    'in-progress': 'col-progress',
    delayed: 'col-progress',
    shipped: 'col-done',
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const targetColumn = String(over.id);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const sourceColumn = COLUMN_FOR_STATUS[task.status];
    if (sourceColumn === targetColumn) return;

    if (sourceColumn === 'col-distribution' && targetColumn === 'col-progress') {
      // 드래그로 떨어뜨리는 즉시 배분을 확정하지 않는다 - 반려와 동일하게 확인 모달을 거친다.
      if (employees.length === 0) return;
      const recommendation = recommend(task.title, employees);
      const recommendedEmp = employees.find(e => e.id === recommendation?.employeeId);
      const selectedEmpId = manualAssignees[task.id] || recommendedEmp?.id;
      const bestEmp = employees.find(e => e.id === selectedEmpId) || recommendedEmp || employees[0];
      const scoreInfo = scoreCandidate({ title: task.title }, toCandidate(bestEmp));
      setDropConfirm({ taskId: task.id, title: task.title, employee: bestEmp, scoreInfo });
    } else if (sourceColumn === 'col-progress' && targetColumn === 'col-done') {
      handleCompleteTask(taskId);
    } else {
      setRejectModal(null);
      useAppStore.getState().setToast(
        `허용되지 않는 이동입니다: '${task.title}'은(는) 순서를 건너뛸 수 없습니다.`,
        'warning'
      );
    }
  };

  const handleConfirmDrop = () => {
    if (!dropConfirm) return;
    approveDistribution(dropConfirm.taskId, dropConfirm.employee.id);
    setManualAssignees(prev => {
      const next = { ...prev };
      delete next[dropConfirm.taskId];
      return next;
    });
    setDropConfirm(null);
  };

  const columns = [
    { phase: 1, title: 'Phase 1. 회의 요약', color: 'blue', count: meetingsRaw.length },
    { phase: 2, title: 'Phase 2. 기획서 검토', color: 'indigo', count: meetingsWaiting.length },
    { phase: 3, title: 'Phase 3. 배분 승인', color: 'amber', count: pendingTasks.length },
    { phase: 4, title: 'Phase 4. 진행 추적', color: 'emerald', count: activeTasks.length },
    { phase: 5, title: 'Phase 5. 완료됨', color: 'gray', count: shippedTasks.length },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-hidden">
      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-red-100">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {rejectModal.type === 'proposal' ? '기획서 반려' : '배분 반려'}
              </h3>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-gray-500 mb-1">대상</p>
              <p className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 px-3 py-2 rounded-lg border">{rejectModal.title}</p>
              <p className="text-xs font-bold text-gray-500 mb-1.5">반려 사유 <span className="text-red-500">*</span></p>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm h-28 resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder={rejectModal.type === 'proposal' ? "예: 3번 안건의 담당자 배정 내용이 누락되었습니다." : "예: 김개발님의 현재 업무량이 90%이므로 박서버님에게 배정 요청합니다."}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button onClick={handleConfirmReject} disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4" /> 반려 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delay Report Modal */}
      {delayModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden border border-amber-100">
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 지연 보고
              </h3>
              <button onClick={() => setDelayModal(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-gray-500 mb-1">대상</p>
              <p className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 px-3 py-2 rounded-lg border">{delayModal.title}</p>
              <p className="text-xs font-bold text-gray-500 mb-1.5">지연 사유 <span className="text-red-500">*</span></p>
              <textarea
                autoFocus
                value={delayReason}
                onChange={e => setDelayReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm h-28 resize-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                placeholder="예: 외부 API 연동 검증에 예상보다 시간이 걸리고 있습니다."
              />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setDelayModal(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button onClick={handleConfirmDelay} disabled={!delayReason.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4" /> 지연 기록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag-to-approve confirmation */}
      {dropConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] overflow-hidden border border-indigo-100">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <User className="w-5 h-5" /> 배분 승인 확인
              </h3>
              <button onClick={() => setDropConfirm(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-gray-500 mb-1">업무</p>
              <p className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 px-3 py-2 rounded-lg border">{dropConfirm.title}</p>
              <p className="text-xs font-bold text-gray-500 mb-1.5">담당자로 배정하고 승인합니다</p>
              <div className="flex items-center gap-2 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">{dropConfirm.employee.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">{dropConfirm.employee.name} <span className="text-gray-400 font-normal text-xs">({dropConfirm.employee.role})</span></div>
                  <div className="text-[10px] text-indigo-700/70">근거: {dropConfirm.scoreInfo.reason} · 적합도 {Math.round(dropConfirm.scoreInfo.score)}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setDropConfirm(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button onClick={handleConfirmDrop}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <User className="w-4 h-4" /> 배분 승인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="text-blue-600 w-5 h-5" /> 핵심 업무 파이프라인 (5 Phase)
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">회의 요약 → 기획서 검토 → 배분 승인/반려 → 진행 추적 → 완료</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> AI Engine Active
          </div>
          <Link href="/meetings" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
            + 회의록 등록
          </Link>
        </div>
      </div>

      {/* Phase progress bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 shrink-0 flex items-center gap-0 overflow-hidden">
        {columns.map((col, i) => (
          <div key={col.phase} className="flex items-center flex-1 min-w-0">
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold",
              col.color === 'indigo' ? "text-indigo-700 bg-indigo-50" :
              col.color === 'amber' ? "text-amber-700 bg-amber-50" :
              col.color === 'emerald' ? "text-emerald-700 bg-emerald-50" : "text-gray-600 bg-gray-50"
            )}>
              <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white",
                col.color === 'indigo' ? "bg-indigo-500" :
                col.color === 'amber' ? "bg-amber-500" :
                col.color === 'emerald' ? "bg-emerald-500" : "bg-gray-400"
              )}>{col.phase}</span>
              {col.title.replace('Phase ' + col.phase + '. ', '')}
              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-black",
                col.color === 'indigo' ? "bg-indigo-200 text-indigo-800" :
                col.color === 'amber' ? "bg-amber-200 text-amber-800" :
                col.color === 'emerald' ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-700"
              )}>{col.count}</span>
            </div>
            {i < columns.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-5 flex gap-4">

        {/* Col 1: Meeting Summarization */}
        <div className="flex-shrink-0 w-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-3 bg-blue-100 px-3 py-2 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-bold text-blue-900 text-xs flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Phase 1. 회의 요약</h3>
            <span className="bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{meetingsRaw.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {meetingsRaw.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                요약 대기 중인 회의록이 없습니다.<br />
                <Link href="/meetings" className="text-blue-500 font-bold hover:underline mt-1 inline-block">회의분석에서 생성 →</Link>
              </div>
            )}
            {meetingsRaw.map((m) => (
              <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">RAW</span>
                  <span className="text-[9px] text-gray-400">{m.date}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-xs mb-2 line-clamp-2">{m.title}</h4>
                <p className="text-[10px] text-gray-500 line-clamp-3 mb-3 bg-gray-50 p-2 rounded-lg leading-relaxed border">
                  {m.summary.slice(0, 3).join(' ')}
                </p>
                <button
                  onClick={() => handleGenerateProposal(m.id)}
                  className="w-full py-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <BrainCircuit className="w-3.5 h-3.5" /> AI 요약 및 기획서 생성
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Proposal Review */}
        <div className="flex-shrink-0 w-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-3 bg-indigo-100 px-3 py-2 rounded-lg border-l-4 border-indigo-500">
            <h3 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5"><FileSignature className="w-3.5 h-3.5" /> Phase 2. 기획서 검토</h3>
            <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{meetingsWaiting.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {meetingsWaiting.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                대기 중인 기획서가 없습니다.<br />
                <Link href="/meetings" className="text-blue-500 font-bold hover:underline mt-1 inline-block">회의분석에서 생성 →</Link>
              </div>
            )}
            {meetingsWaiting.map((m) => (
              <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">PROPOSAL</span>
                  <span className="text-[9px] text-gray-400">{m.date}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-xs mb-2 line-clamp-2">{m.title}</h4>
                <p className="text-[10px] text-gray-500 line-clamp-3 mb-3 bg-gray-50 p-2 rounded-lg leading-relaxed border">
                  {m.proposalContent?.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ') || '기획서 내용 없음'}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => downloadPPT(m.id)}
                    className="w-full py-2 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Download className="w-3 h-3" /> PPTX로 자동 생성 (다운로드)
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectProposal(m.id, m.title)}
                      className="flex-1 py-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" /> 반려
                    </button>
                    <button
                      onClick={() => handleExtractTasks(m.id)}
                      className="flex-[2] py-2 text-[10px] font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" /> 검토완료 → 배분 요청
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Pending Distribution */}
        <div className="flex-shrink-0 w-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-3 bg-amber-100 px-3 py-2 rounded-lg border-l-4 border-amber-500">
            <h3 className="font-bold text-amber-900 text-xs flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Phase 3. 배분 승인</h3>
            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
          </div>
          <DroppableColumn id="col-distribution">
            {pendingTasks.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                배분 대기 중인 업무가 없습니다.
              </div>
            )}
            {pendingTasks.map((t) => {
              const recommendedEmp = employees.find(e => e.id === recommend(t.title, employees)?.employeeId);
              const selectedEmpId = manualAssignees[t.id] || recommendedEmp?.id;
              const selectedEmp = employees.find(e => e.id === selectedEmpId) || recommendedEmp;
              const selectedScore = selectedEmp ? scoreCandidate({ title: t.title }, toCandidate(selectedEmp)) : null;

              return (
                <DraggableCard key={t.id} id={t.id}>
                <div className={cn(
                  "bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-amber-400 border-y border-r border-y-gray-100 border-r-gray-100 hover:shadow-md transition-all",
                  t.rejectedReason && "border-l-red-400"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full",
                      t.rejectedReason ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {t.rejectedReason ? '재검토 필요' : 'AI 추천 대기'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.estimatedHours}h</span>
                  </div>
                  {t.rejectedReason && (
                    <div className="mb-2 text-[9px] text-red-600 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 font-medium">
                      <span className="font-black">이전 반려 사유:</span> {t.rejectedReason}
                    </div>
                  )}
                  <h4 className="font-bold text-gray-900 text-xs mb-1 line-clamp-2">{t.title}</h4>
                  <p className="text-[9px] text-gray-400 mb-2">출처: {t.source}</p>
                  {selectedEmp && (
                    <div className="mb-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-bold text-blue-600">
                          {manualAssignees[t.id] ? '수동 지정 담당자' : 'AI 추천 담당자'}
                        </div>
                        <select
                          className="text-[10px] font-bold text-gray-700 bg-white border border-blue-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                          value={selectedEmp.id}
                          onChange={(e) => setManualAssignees(prev => ({ ...prev, [t.id]: e.target.value }))}
                        >
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">{selectedEmp.avatar}</div>
                        <div>
                          <div className="text-[11px] font-bold text-gray-900">{selectedEmp.name} <span className="text-gray-400 font-normal">({selectedEmp.role})</span></div>
                          <div className={cn("text-[9px] font-bold", selectedEmp.currentWorkload > 80 ? "text-red-600" : selectedEmp.currentWorkload > 60 ? "text-amber-600" : "text-emerald-600")}>
                            현재 부하: {selectedEmp.currentWorkload}%
                          </div>
                        </div>
                        {selectedScore && (
                          <span className="ml-auto shrink-0 text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            적합도 {Math.round(selectedScore.score)}
                          </span>
                        )}
                      </div>
                      {selectedScore && (
                        <p className="mt-1.5 text-[9px] text-blue-700/70 leading-relaxed">근거: {selectedScore.reason}</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectDistribution(t.id, t.title)}
                      className="flex-1 py-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" /> 반려
                    </button>
                    <button
                      onClick={() => handleApproveDistribution(t)}
                      className="flex-[2] py-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <User className="w-3.5 h-3.5" /> 배분 승인 (결재)
                    </button>
                  </div>
                </div>
                </DraggableCard>
              );
            })}
          </DroppableColumn>
        </div>

        {/* Col 4: Active/Delayed */}
        <div className="flex-shrink-0 w-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-3 bg-emerald-100 px-3 py-2 rounded-lg border-l-4 border-emerald-500">
            <h3 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Phase 4. 진행 추적</h3>
            <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{activeTasks.length}</span>
          </div>
          <DroppableColumn id="col-progress">
            {activeTasks.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                진행 중인 업무가 없습니다.
              </div>
            )}
            {activeTasks.map((t) => {
              const assignee = employees.find(e => e.id === t.assigneeId);
              const isDelayed = t.status === 'delayed';
              const isOverdue = !isDelayed && t.dueDate && new Date(t.dueDate).getTime() < Date.now();
              return (
                <DraggableCard key={t.id} id={t.id}>
                <div className={cn(
                  "bg-white p-4 rounded-xl shadow-sm border-l-4 border-y border-r border-y-gray-100 border-r-gray-100 hover:shadow-md transition-all",
                  isDelayed ? "border-l-red-500 bg-red-50/30" : isOverdue ? "border-l-amber-500 bg-amber-50/30" : "border-l-emerald-500"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full",
                      isDelayed ? "bg-red-100 text-red-700" : isOverdue ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {isDelayed ? '⚠ 지연 감지됨' : isOverdue ? '⏰ SLA 초과 (자동 감지)' : '진행 중'}
                    </span>
                    {assignee && (
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-black">{assignee.avatar}</div>
                        <span className="text-[9px] font-bold text-gray-700">{assignee.name}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 text-xs mb-3 line-clamp-2">{t.title}</h4>
                  {isDelayed ? (
                    <div className="mb-3 text-[10px]">
                      <div className="text-red-700 font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 지연 사유 수집됨</div>
                      <div className="p-2 bg-white rounded-lg border border-red-200 text-gray-600 leading-snug">"{t.delayReason}"</div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-1">
                        <span>진행률</span><span>{t.progress || 10}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${t.progress || 10}%` }} />
                      </div>
                      {t.dueDate && (
                        <div className={cn("text-[9px] font-bold mt-1.5", isOverdue ? "text-amber-700" : "text-gray-400")}>
                          {formatDueLabel(t.dueDate)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {isDelayed ? (
                      <button onClick={() => handleReallocate(t)} className="w-full py-2 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1">
                        <BrainCircuit className="w-3.5 h-3.5" /> AI 재조정안 승인
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleOpenDelayModal(t)} className="flex-1 py-2 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors flex items-center justify-center gap-1">
                          ⚠ 지연 보고
                        </button>
                        <button onClick={() => handleCompleteTask(t.id)} className="flex-[2] py-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 완료 처리
                        </button>
                      </>
                    )}
                  </div>
                </div>
                </DraggableCard>
              );
            })}
          </DroppableColumn>
        </div>

        {/* Col 5: Completed */}
        <div className="flex-shrink-0 w-[300px] flex flex-col opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between mb-3 bg-gray-200 px-3 py-2 rounded-lg border-l-4 border-gray-400">
            <h3 className="font-bold text-gray-700 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Phase 5. 완료됨</h3>
            <span className="bg-gray-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{shippedTasks.length}</span>
          </div>
          <DroppableColumn id="col-done">
            {shippedTasks.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">완료된 업무가 없습니다. (진행 카드를 여기로 끌어와 완료 처리할 수 있습니다)</div>
            )}
            {shippedTasks.map((t) => {
              const assignee = employees.find(e => e.id === t.assigneeId);
              return (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">✓ 완료</span>
                    {t.completedAt && <span className="text-[9px] text-gray-400">{t.completedAt}</span>}
                  </div>
                  <h4 className="font-bold text-gray-500 text-xs line-through mb-1">{t.title}</h4>
                  {assignee && <p className="text-[9px] text-gray-400">{assignee.name}</p>}
                </div>
              );
            })}
          </DroppableColumn>
        </div>
      </div>
      </DndContext>
    </div>
  );
}