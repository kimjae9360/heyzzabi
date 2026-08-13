import type { User, Meeting, Planning, Task, Notification } from '@prisma/client';

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const SYSTEM_ROLE_TO_LEVEL: Record<string, 'member' | 'lead' | 'pm'> = {
  USER: 'member',
  PM: 'lead',
  ADMIN: 'pm',
};
export const LEVEL_TO_SYSTEM_ROLE: Record<'member' | 'lead' | 'pm', string> = {
  member: 'USER',
  lead: 'PM',
  pm: 'ADMIN',
};

export function toEmployeeDTO(user: User) {
  return {
    id: user.user_id,
    employeeNo: user.employee_no,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    department: user.department,
    position: user.position,
    role: user.job_title ?? '',
    level: SYSTEM_ROLE_TO_LEVEL[user.role] ?? 'member',
    status: user.status as 'ACTIVE' | 'LEAVE' | 'RESIGNED' | 'LOCKED',
    hireDate: user.hire_date ? user.hire_date.toISOString().slice(0, 10) : undefined,
    profileImage: user.profile_image ?? undefined,
    lastLoginAt: user.last_login_at ? user.last_login_at.toISOString() : undefined,
    skills: parseJsonArray(user.stack),
    certifications: parseJsonArray(user.certifications),
    pastProjects: parseJsonArray(user.past_projects),
    currentWorkload: user.current_workload,
    avatar: user.name[0],
    createdAt: user.created_at.toISOString().slice(0, 10),
  };
}

const MEETING_STATUS_TO_UI: Record<string, string> = { DRAFT: 'DRAFT', REVIEW: 'REVIEW', CONFIRMED: 'CONFIRMED' };

export function toMeetingDTO(meeting: Meeting & { plannings?: Planning[] }) {
  const planning = meeting.plannings?.[0];
  let analysis: { agenda: string[]; decisions: string[]; actionItems: string[] } | undefined;
  if (planning?.analysis_json) {
    try {
      analysis = JSON.parse(planning.analysis_json);
    } catch {
      analysis = undefined;
    }
  }
  return {
    id: meeting.meeting_id,
    title: meeting.title,
    date: meeting.meeting_date.toLocaleDateString('ko-KR'),
    meetingDateIso: meeting.meeting_date.toISOString(),
    summary: meeting.content.split('\n'),
    status: MEETING_STATUS_TO_UI[meeting.status] ?? meeting.status,
    hasProposal: !!planning,
    proposalId: planning?.planning_id,
    proposalTitle: planning?.title,
    proposalContent: planning?.content,
    analysis,
    isProposalApproved: planning?.status === 'APPROVED' || planning?.status === 'COMPLETED',
    isTasksExtracted: planning?.status === 'APPROVED' || planning?.status === 'COMPLETED',
    isProposalRejected: planning?.status === 'REJECTED',
    proposalRejectedReason: planning?.rejected_reason ?? undefined,
  };
}

export function toPlanningDTO(planning: Planning) {
  return {
    id: planning.planning_id,
    meetingId: planning.meeting_id,
    title: planning.title,
    content: planning.content,
    version: planning.version,
    status: planning.status,
    rejectedReason: planning.rejected_reason ?? undefined,
  };
}

export function toTaskDTO(task: Task & { planning?: Planning | null; meeting?: Meeting | null }) {
  return {
    id: task.task_id,
    title: task.title,
    description: task.description ?? undefined,
    source: task.planning?.title ?? task.meeting?.title ?? '',
    status: task.status,
    assigneeId: task.assignee_id ?? undefined,
    progress: task.progress,
    estimatedHours: task.estimated_hours ?? undefined,
    difficulty: task.difficulty ?? undefined,
    rejectedReason: task.rejected_reason ?? undefined,
    delayReason: task.delay_reason ?? undefined,
    completedAt: task.completed_at ? task.completed_at.toLocaleDateString('ko-KR') : undefined,
    completedAtIso: task.completed_at ? task.completed_at.toISOString() : undefined,
    createdAtIso: task.created_at.toISOString(),
    planningId: task.planning_id ?? undefined,
    meetingId: task.meeting_id ?? undefined,
  };
}

export function toNotificationDTO(n: Notification) {
  return {
    id: n.notification_id,
    message: n.message,
    type: n.type,
    link: n.link ?? undefined,
    read: n.read,
    timestamp: n.created_at.toLocaleString('ko-KR'),
  };
}
