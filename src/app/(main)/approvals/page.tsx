'use client';

import { useState } from 'react';
import { CheckSquare, Clock, CheckCircle2, AlertTriangle, User, CalendarCheck, X, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

export default function Approvals() {
  const { tasks = [], employees = [], approveDistribution, rejectDistribution } = useAppStore();

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  const pendingTasks = tasks.filter(t => t.status === 'pending-distribution');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const delayedTasks = tasks.filter(t => t.status === 'delayed');
  const completedTasks = tasks.filter(t => t.status === 'shipped');

  const handleOpenApprove = (taskId: string) => {
    setApproveTargetId(taskId);
    const best = [...employees].sort((a, b) => a.currentWorkload - b.currentWorkload)[0];
    setSelectedAssigneeId(best?.id || '');
  };

  const handleConfirmApprove = () => {
    if (!approveTargetId || !selectedAssigneeId) return;
    approveDistribution(approveTargetId, selectedAssigneeId);
    setApproveTargetId(null);
    setSelectedAssigneeId('');
  };

  const handleConfirmReject = () => {
    if (!rejectTargetId || !rejectReason.trim()) return;
    rejectDistribution(rejectTargetId, rejectReason.trim());
    setRejectTargetId(null);
    setRejectReason('');
  };

  const approveTask = tasks.find(t => t.id === approveTargetId);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7]">
      {/* Approve Modal */}
      {approveTargetId && approveTask && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden border border-blue-100">
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-blue-900 flex items-center gap-2"><CheckSquare className="w-5 h-5" /> 배분 승인 — 담당자 최종 확정</h3>
              <button onClick={() => setApproveTargetId(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-3 mb-5 border">
                <p className="text-xs font-bold text-gray-500">승인 대상 업무</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{approveTask.title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                  <span className={cn("px-2 py-0.5 rounded font-bold text-[10px]",
                    approveTask.difficulty === 'High' ? "bg-red-100 text-red-700" :
                    approveTask.difficulty === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  )}>{approveTask.difficulty}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{approveTask.estimatedHours}h</span>
                  <span>출처: {approveTask.source}</span>
                </div>
              </div>

              <p className="text-xs font-bold text-gray-700 mb-3">담당자 선택 (AI 추천순 정렬됨)</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {[...employees].sort((a, b) => a.currentWorkload - b.currentWorkload).map(emp => (
                  <label key={emp.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    selectedAssigneeId === emp.id ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200 hover:border-gray-300 bg-white"
                  )}>
                    <input type="radio" name="assignee" value={emp.id} checked={selectedAssigneeId === emp.id} onChange={() => setSelectedAssigneeId(emp.id)} className="accent-blue-600" />
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">{emp.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{emp.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{emp.role}</span>
                        {[...employees].sort((a, b) => a.currentWorkload - b.currentWorkload)[0].id === emp.id && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">AI 추천</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full",
                            emp.currentWorkload > 80 ? "bg-red-500" : emp.currentWorkload > 60 ? "bg-amber-500" : "bg-emerald-500"
                          )} style={{ width: `${emp.currentWorkload}%` }} />
                        </div>
                        <span className={cn("text-[10px] font-bold",
                          emp.currentWorkload > 80 ? "text-red-600" : emp.currentWorkload > 60 ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {emp.currentWorkload}%
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{emp.skills?.slice(0, 3).join(', ')}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setApproveTargetId(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
                <button onClick={handleConfirmApprove} disabled={!selectedAssigneeId}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <CheckSquare className="w-4 h-4" /> 결재 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTargetId && (
        <div className="fixed inset-0 bg-gray-900/50 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden border border-red-100">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> 배분 반려</h3>
              <button onClick={() => setRejectTargetId(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">반려 사유를 작성해 주세요. 해당 업무는 배분 대기 상태로 되돌아갑니다.</p>
              <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm h-28 resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="예: 박서버님이 해당 기술 스택을 다루지 않습니다. 김개발님에게 재배정 요청합니다." />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setRejectTargetId(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
                <button onClick={handleConfirmReject} disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> 반려 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="text-blue-600 w-5 h-5" /> 결재함 (Approvals)
        </h2>
        <p className="text-gray-500 text-xs mt-0.5">배분 대기 업무를 직접 승인/반려하고, 완료 이력과 지연 현황을 통합 관리합니다.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '승인 대기', value: pendingTasks.length, color: 'amber', icon: Clock },
              { label: '진행 중', value: inProgressTasks.length, color: 'blue', icon: User },
              { label: '지연 중', value: delayedTasks.length, color: 'red', icon: AlertTriangle },
              { label: '결재 완료', value: completedTasks.length, color: 'emerald', icon: CheckCircle2 },
            ].map((c, i) => (
              <div key={i} className={cn("bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3",
                c.color === 'amber' ? "border-amber-100" :
                c.color === 'blue' ? "border-blue-100" :
                c.color === 'red' ? "border-red-100" : "border-emerald-100"
              )}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                  c.color === 'amber' ? "bg-amber-50" :
                  c.color === 'blue' ? "bg-blue-50" :
                  c.color === 'red' ? "bg-red-50" : "bg-emerald-50"
                )}>
                  <c.icon className={cn("w-5 h-5",
                    c.color === 'amber' ? "text-amber-500" :
                    c.color === 'blue' ? "text-blue-500" :
                    c.color === 'red' ? "text-red-500" : "text-emerald-500"
                  )} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500">{c.label}</div>
                  <div className={cn("text-2xl font-black",
                    c.color === 'amber' ? "text-amber-600" :
                    c.color === 'blue' ? "text-blue-600" :
                    c.color === 'red' ? "text-red-600" : "text-emerald-600"
                  )}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Approval Queue */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-amber-50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> 배분 승인 대기 큐
                <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full ml-1">{pendingTasks.length}</span>
              </h3>
              <Link href="/pipeline" className="text-xs font-bold text-amber-700 hover:underline">파이프라인 보기 →</Link>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="py-14 text-center">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm font-medium">승인 대기 중인 업무가 없습니다.</p>
                <Link href="/meetings" className="mt-2 inline-block text-xs text-blue-500 font-bold hover:underline">회의분석에서 기획서 생성하기 →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingTasks.map(task => {
                  const taskEmployees = [...employees].sort((a, b) => a.currentWorkload - b.currentWorkload);
                  return (
                    <div key={task.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-gray-900">{task.title}</span>
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded",
                            task.difficulty === 'High' ? "bg-red-100 text-red-700" :
                            task.difficulty === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          )}>{task.difficulty}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 font-medium">
                          <span>출처: {task.source}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{task.estimatedHours}h</span>
                        </div>
                        {task.rejectedReason && (
                          <div className="mt-1 text-[9px] text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 font-medium">
                            이전 반려: {task.rejectedReason}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">AI 추천: <strong className="text-gray-900">{taskEmployees[0]?.name}</strong> ({taskEmployees[0]?.currentWorkload}%)</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setRejectTargetId(task.id); setRejectReason(''); }}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                        >
                          반려
                        </button>
                        <button
                          onClick={() => handleOpenApprove(task.id)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                        >
                          승인
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delayed Warning */}
          {delayedTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
              <div className="border-b border-red-100 px-6 py-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-900">지연 감지 — 즉시 조치 필요</h3>
              </div>
              <div className="divide-y divide-red-100">
                {delayedTasks.map(task => {
                  const assignee = employees.find(e => e.id === task.assigneeId);
                  return (
                    <div key={task.id} className="px-6 py-4 flex items-center gap-4">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-red-900 text-sm">{task.title}</p>
                        <p className="text-[10px] text-red-500 mt-0.5">지연 사유: {task.delayReason || '사유 미기록'}</p>
                      </div>
                      {assignee && (
                        <div className="text-xs font-bold text-red-700 shrink-0 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {assignee.name}
                        </div>
                      )}
                      <Link href="/pipeline" className="shrink-0 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors">
                        재조정 실행 →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed History */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-500" /> 결재 완료 이력
                <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">{completedTasks.length}</span>
              </h3>
            </div>
            {completedTasks.length === 0 ? (
              <div className="py-12 text-center">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">완료된 업무가 없습니다. 파이프라인에서 업무를 완료 처리하면 이곳에 기록됩니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {completedTasks.map(task => {
                  const assignee = employees.find(e => e.id === task.assigneeId);
                  return (
                    <div key={task.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-500 text-sm line-through">{task.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">출처: {task.source}</p>
                      </div>
                      {assignee && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">{assignee.avatar}</div>
                          <span className="text-xs font-bold text-gray-600">{assignee.name}</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
                        ✓ {task.completedAt || '완료'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}