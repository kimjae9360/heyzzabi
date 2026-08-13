import { create } from 'zustand';
import { generateProposalPPT } from '@/lib/pptGenerator';

export type EmployeeStatus = 'ACTIVE' | 'LEAVE' | 'RESIGNED' | 'LOCKED';

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  role: string; // 직무
  level: 'member' | 'lead' | 'pm'; // 시스템 권한
  status: EmployeeStatus;
  hireDate?: string;
  profileImage?: string;
  lastLoginAt?: string;
  skills?: string[];
  certifications?: string[];
  pastProjects?: string[];
  currentWorkload: number;
  avatar: string;
  createdAt: string;
}

export interface StructuredAnalysis {
  agenda: string[];
  decisions: string[];
  actionItems: string[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  meetingDateIso: string;
  summary: string[];
  analysis?: StructuredAnalysis;

  hasProposal: boolean;
  proposalContent?: string;
  isProposalApproved: boolean;
  isProposalRejected: boolean;
  proposalRejectedReason?: string;

  isTasksExtracted: boolean;
}

export type TaskUiStatus = 'pending-distribution' | 'in-progress' | 'delayed' | 'shipped';

export interface Task {
  id: string;
  title: string;
  source: string;
  estimatedHours?: number;
  difficulty?: 'High' | 'Medium' | 'Low';
  status: TaskUiStatus;
  assigneeId?: string;
  progress?: number;
  delayReason?: string;
  rejectedReason?: string;
  completedAt?: string;
  completedAtIso?: string;
  createdAtIso: string;
  dueDate?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

const DB_TASK_STATUS_TO_UI: Record<string, TaskUiStatus | null> = {
  PENDING_DISTRIBUTION: 'pending-distribution',
  TODO: 'pending-distribution',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'in-progress',
  DELAYED: 'delayed',
  DONE: 'shipped',
  CANCELLED: null, // 칸반에서 제외
};

async function apiFetch<T>(url: string, options: RequestInit = {}, activeUserId?: string | null): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(activeUserId ? { 'x-user-id': activeUserId } : {}),
      ...options.headers,
    },
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    throw new Error((body && body.error) || `요청에 실패했습니다. (${response.status})`);
  }
  return body as T;
}

interface AppState {
  meetings: Meeting[];
  tasks: Task[];
  employees: Employee[];
  notifications: Notification[];

  activeUserId: string | null;
  setActiveUser: (id: string) => void;

  loading: boolean;
  toast: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;

  fetchData: () => Promise<void>;

  // Meetings
  addMeeting: (data: { title: string; content: string }) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;

  // Pipeline phase 1: Meeting -> Proposal (real AI call)
  generateProposal: (meetingId: string) => Promise<void>;
  editProposal: (meetingId: string, content: string) => Promise<void>;
  approveProposalAndExtractTasks: (meetingId: string) => Promise<void>;
  rejectProposal: (meetingId: string, reason: string) => Promise<void>;
  downloadPPT: (meetingId: string) => Promise<void>;

  // Pipeline phase 2: Proposal -> Distribution
  approveDistribution: (taskId: string, assigneeId: string) => Promise<void>;
  rejectDistribution: (taskId: string, reason: string) => Promise<void>;

  // Pipeline phase 3/4
  reportDelay: (taskId: string, reason: string) => Promise<void>;
  reallocateTask: (taskId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskUiStatus) => Promise<void>;
  updateTaskProgress: (taskId: string, progress: number) => Promise<void>;

  // Employees
  addEmployee: (emp: Omit<Employee, 'id' | 'currentWorkload' | 'avatar' | 'employeeNo' | 'createdAt'>) => Promise<void>;
  updateEmployee: (empId: string, patch: Partial<Omit<Employee, 'id'>>) => Promise<void>;
  removeEmployee: (empId: string) => Promise<void>;

  // Notifications
  markAllNotificationsRead: () => Promise<void>;

  // Toast
  setToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  clearToast: () => void;
}

// meeting/planning payload from /api/meetings 응답 -> UI Meeting 모델로 매핑
interface MeetingApiDTO {
  id: string; title: string; date: string; meetingDateIso: string; summary: string[]; hasProposal: boolean;
  proposalId?: string; proposalTitle?: string; proposalContent?: string;
  analysis?: StructuredAnalysis; isProposalApproved: boolean; isTasksExtracted: boolean;
  isProposalRejected: boolean; proposalRejectedReason?: string;
}
function mapMeeting(m: MeetingApiDTO): Meeting {
  return {
    id: m.id, title: m.title, date: m.date, meetingDateIso: m.meetingDateIso, summary: m.summary,
    analysis: m.analysis, hasProposal: m.hasProposal, proposalContent: m.proposalContent,
    isProposalApproved: m.isProposalApproved, isTasksExtracted: m.isTasksExtracted,
    isProposalRejected: m.isProposalRejected, proposalRejectedReason: m.proposalRejectedReason,
  };
}

interface TaskApiDTO {
  id: string; title: string; description?: string; source: string; status: string;
  assigneeId?: string; progress: number; estimatedHours?: number; difficulty?: string;
  rejectedReason?: string; delayReason?: string; completedAt?: string; completedAtIso?: string; createdAtIso: string;
}
function mapTask(t: TaskApiDTO): Task | null {
  const status = DB_TASK_STATUS_TO_UI[t.status];
  if (!status) return null;
  return {
    id: t.id, title: t.title, source: t.source, status,
    assigneeId: t.assigneeId, progress: t.progress, estimatedHours: t.estimatedHours,
    difficulty: t.difficulty as Task['difficulty'], rejectedReason: t.rejectedReason,
    delayReason: t.delayReason, completedAt: t.completedAt, completedAtIso: t.completedAtIso, createdAtIso: t.createdAtIso,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  meetings: [],
  tasks: [],
  employees: [],
  notifications: [],
  activeUserId: null,
  loading: false,
  toast: null,

  setActiveUser: (id) => set({ activeUserId: id }),

  fetchData: async () => {
    set({ loading: true });
    try {
      const [meetings, tasks, employees, notifications] = await Promise.all([
        apiFetch<MeetingApiDTO[]>('/api/meetings'),
        apiFetch<TaskApiDTO[]>('/api/tasks'),
        apiFetch<Employee[]>('/api/employees'),
        apiFetch<Notification[]>('/api/notifications'),
      ]);
      set({
        meetings: meetings.map(mapMeeting),
        tasks: tasks.map(mapTask).filter((t): t is Task => t !== null),
        employees,
        notifications,
        loading: false,
        activeUserId: get().activeUserId || employees.find(e => e.level === 'pm')?.id || employees[0]?.id || null,
      });
    } catch (err) {
      set({ loading: false, toast: { message: err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.', type: 'error' } });
    }
  },

  addMeeting: async ({ title, content }) => {
    try {
      await apiFetch('/api/meetings', { method: 'POST', body: JSON.stringify({ title, content }) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '회의록이 등록되었습니다.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '회의록 등록에 실패했습니다.', type: 'error' } });
    }
  },

  deleteMeeting: async (meetingId) => {
    try {
      await apiFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' }, get().activeUserId);
      set(state => ({ meetings: state.meetings.filter(m => m.id !== meetingId), toast: { message: '회의록이 삭제되었습니다.', type: 'info' } }));
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '회의록 삭제에 실패했습니다.', type: 'error' } });
    }
  },

  generateProposal: async (meetingId) => {
    try {
      set({ toast: { message: 'AI가 회의록을 분석해 기획서를 작성하고 있습니다...', type: 'info' } });
      await apiFetch(`/api/meetings/${meetingId}/review-complete`, { method: 'POST' }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: 'AI 기획서 초안이 생성되었습니다. 내용을 검토해 주세요.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '기획서 생성에 실패했습니다.', type: 'error' } });
    }
  },

  editProposal: async (meetingId, content) => {
    const meeting = get().meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    try {
      await apiFetch(`/api/meetings/${meetingId}`, { method: 'PATCH', body: JSON.stringify({}) }, get().activeUserId);
      set(state => ({ meetings: state.meetings.map(m => m.id === meetingId ? { ...m, proposalContent: content } : m) }));
    } catch {
      // editProposal은 로컬 편집 상태만 반영 (저장은 별도 planning PATCH 라우트 필요 시 확장)
      set(state => ({ meetings: state.meetings.map(m => m.id === meetingId ? { ...m, proposalContent: content } : m) }));
    }
  },

  rejectProposal: async (meetingId, reason) => {
    const meeting = get().meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    try {
      // meeting -> planning id는 서버가 알고 있으므로, 회의 상세에서 프로포절 id를 못 찾을 수 있어
      // review-complete 흐름에서 이미 planning이 생성되어 있어야 함. 여기서는 meeting id로 재조회 후 처리.
      const fresh = await apiFetch<MeetingApiDTO[]>('/api/meetings');
      const target = fresh.find(m => m.id === meetingId);
      if (!target?.proposalId) throw new Error('반려할 기획서를 찾을 수 없습니다.');
      await apiFetch(`/api/plannings/${target.proposalId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '기획서가 반려되었습니다.', type: 'warning' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '기획서 반려에 실패했습니다.', type: 'error' } });
    }
  },

  downloadPPT: async (meetingId) => {
    const meeting = get().meetings.find(m => m.id === meetingId);
    if (!meeting || !meeting.proposalContent) {
      set({ toast: { message: '기획서가 존재하지 않습니다.', type: 'error' } });
      return;
    }
    set({ toast: { message: 'PPT 생성 중입니다. 잠시만 기다려주세요...', type: 'info' } });
    try {
      await generateProposalPPT(meeting.title, meeting.proposalContent, meeting.date);
      set({ toast: { message: 'PPT가 성공적으로 다운로드 되었습니다.', type: 'success' } });
    } catch (e) {
      set({ toast: { message: e instanceof Error ? e.message : 'PPT 생성 중 오류가 발생했습니다.', type: 'error' } });
    }
  },

  approveProposalAndExtractTasks: async (meetingId) => {
    const meeting = get().meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    try {
      set({ toast: { message: 'AI가 기획서를 업무 단위로 분해하고 있습니다...', type: 'info' } });
      const fresh = await apiFetch<MeetingApiDTO[]>('/api/meetings');
      const target = fresh.find(m => m.id === meetingId);
      if (!target?.proposalId) throw new Error('배분할 기획서를 찾을 수 없습니다.');
      const tasks = await apiFetch<TaskApiDTO[]>(`/api/plannings/${target.proposalId}/approve`, { method: 'POST' }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: `${tasks.length}개의 업무가 파이프라인 배분 대기열에 추가되었습니다.`, type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '업무 분해에 실패했습니다.', type: 'error' } });
    }
  },

  approveDistribution: async (taskId, assigneeId) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/approve-distribution`, { method: 'POST', body: JSON.stringify({ assigneeId }) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '업무가 배정되었습니다.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '배분 승인에 실패했습니다.', type: 'error' } });
    }
  },

  rejectDistribution: async (taskId, reason) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/reject-distribution`, { method: 'POST', body: JSON.stringify({ reason }) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '배분이 반려되었습니다.', type: 'warning' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '배분 반려에 실패했습니다.', type: 'error' } });
    }
  },

  reportDelay: async (taskId, reason) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/report-delay`, { method: 'POST', body: JSON.stringify({ reason }) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '지연이 감지되어 기록되었습니다.', type: 'warning' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '지연 보고에 실패했습니다.', type: 'error' } });
    }
  },

  reallocateTask: async (taskId) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/reallocate`, { method: 'POST' }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: 'AI 재조정이 완료되었습니다.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '재조정에 실패했습니다.', type: 'error' } });
    }
  },

  updateTaskStatus: async (taskId, status) => {
    const dbStatus = status === 'shipped' ? 'DONE' : status === 'in-progress' ? 'IN_PROGRESS' : status === 'delayed' ? 'DELAYED' : 'PENDING_DISTRIBUTION';
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status: dbStatus }) }, get().activeUserId);
      await get().fetchData();
      if (status === 'shipped') set({ toast: { message: '업무가 완료 처리되어 결재함에 기록되었습니다.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '상태 변경에 실패했습니다.', type: 'error' } });
    }
  },

  updateTaskProgress: async (taskId, progress) => {
    set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, progress: Math.max(0, Math.min(100, progress)) } : t) }));
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ progress }) }, get().activeUserId);
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '진행률 저장에 실패했습니다.', type: 'error' } });
    }
  },

  addEmployee: async (emp) => {
    try {
      await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(emp) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: `${emp.name}님이 팀에 등록되었습니다.`, type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '직원 등록에 실패했습니다.', type: 'error' } });
    }
  },

  updateEmployee: async (empId, patch) => {
    try {
      await apiFetch(`/api/employees/${empId}`, { method: 'PATCH', body: JSON.stringify(patch) }, get().activeUserId);
      await get().fetchData();
      set({ toast: { message: '직원 정보가 수정되었습니다.', type: 'success' } });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '직원 정보 수정에 실패했습니다.', type: 'error' } });
    }
  },

  removeEmployee: async (empId) => {
    try {
      await apiFetch(`/api/employees/${empId}`, { method: 'DELETE' }, get().activeUserId);
      set(state => ({ employees: state.employees.filter(e => e.id !== empId), toast: { message: '직원이 삭제되었습니다.', type: 'info' } }));
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '직원 삭제에 실패했습니다.', type: 'error' } });
    }
  },

  markAllNotificationsRead: async () => {
    set(state => ({ notifications: state.notifications.map(n => ({ ...n, read: true })) }));
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch (err) {
      set({ toast: { message: err instanceof Error ? err.message : '알림 처리에 실패했습니다.', type: 'error' } });
    }
  },

  setToast: (msg, type = 'info') => set({ toast: { message: msg, type } }),
  clearToast: () => set({ toast: null }),
}));
