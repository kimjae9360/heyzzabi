// erpnext 스타일 상태 어휘 + plane 스타일 전이 검증(불허 시 명확한 에러) 채택.
export const TASK_STATUSES = ['PENDING_DISTRIBUTION', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DELAYED', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING_DISTRIBUTION: ['IN_PROGRESS', 'CANCELLED'],
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['REVIEW', 'DELAYED', 'DONE', 'CANCELLED'],
  REVIEW: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DELAYED: ['IN_PROGRESS', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
};

export function assertValidTransition(from: string, to: string) {
  const fromStatus = from as TaskStatus;
  const toStatus = to as TaskStatus;
  if (fromStatus === toStatus) return;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    throw new Error(`상태 전이가 불가합니다: ${from} → ${to}`);
  }
}
