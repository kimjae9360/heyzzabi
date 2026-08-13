import { create } from 'zustand';
import { apiMeetings, apiSpecs, apiTasks } from '../lib/api';
import { generateProposalPPT } from '../lib/pptGenerator';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface StructuredAnalysis {
  agenda: string[];       // 안건
  decisions: string[];    // 결정사항
  actionItems: string[];  // 액션아이템
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  summary: string[];        // raw STT content
  analysis?: StructuredAnalysis; // AI structured extraction

  hasProposal: boolean;
  proposalContent?: string;
  isProposalApproved: boolean;
  isProposalRejected: boolean;
  proposalRejectedReason?: string;

  isTasksExtracted: boolean;
  extractedTasks: string[];
}

export interface Task {
  id: string;
  title: string;
  source: string;
  estimatedHours?: number;
  difficulty?: 'High' | 'Medium' | 'Low';
  status: 'pending-distribution' | 'in-progress' | 'delayed' | 'shipped';
  assigneeId?: string;
  progress?: number;
  delayReason?: string;
  rejectedReason?: string;   // set when distribution was rejected
  completedAt?: string;
  dueDate?: string;
}

export type EmployeeStatus = 'ACTIVE' | 'LEAVE' | 'RESIGNED' | 'LOCKED';

export interface Employee {
  id: string;               // user_id / 사번
  employeeNo: string;       // 사원번호
  name: string;
  email: string;            // 회사 이메일
  phone?: string;           // 연락처
  department: string;       // 부서 (department_id)
  position: string;         // 직급 (position_id) - 사원/대리/과장/부장 등
  role: string;             // 직무 - Frontend/Backend/Designer/PM 등
  level: 'member' | 'lead' | 'pm'; // 시스템 권한 (role) - 직원/팀장/관리자
  status: EmployeeStatus;   // 계정 상태
  hireDate?: string;        // 입사일
  profileImage?: string;    // 프로필 이미지
  lastLoginAt?: string;     // 최근 로그인
  skills?: string[];        // 기술 스택 (stack)
  certifications?: string[];
  pastProjects?: string[];
  currentWorkload: number;
  avatar: string;
  createdAt: string;        // 가입일
}

interface AppState {
  meetings: Meeting[];
  tasks: Task[];
  employees: Employee[];
  notifications: Notification[];

  // toast notification (temporary)
  toast: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  // Sync API
  fetchData: () => Promise<void>;

  // Meetings
  addMeeting: (meeting: Omit<Meeting, 'id' | 'hasProposal' | 'isProposalApproved' | 'isProposalRejected' | 'isTasksExtracted' | 'extractedTasks'>) => Promise<void>;
  deleteMeeting: (meetingId: string) => void;

  // Pipeline phase 1: Meeting → Proposal
  generateProposal: (meetingId: string) => Promise<void>;
  editProposal: (meetingId: string, content: string) => void;
  approveProposalAndExtractTasks: (meetingId: string) => Promise<void>;
  rejectProposal: (meetingId: string, reason: string) => void;
  downloadPPT: (meetingId: string) => Promise<void>;

  // Pipeline phase 2: Proposal → Distribution
  approveDistribution: (taskId: string, newAssigneeId: string) => Promise<void>;
  rejectDistribution: (taskId: string, reason: string) => void;

  // Pipeline phase 3/4: In-progress → Shipped
  reportDelay: (taskId: string, reason: string) => void;
  reallocateTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;

  // Employees
  addEmployee: (emp: Omit<Employee, 'id' | 'currentWorkload' | 'avatar' | 'employeeNo' | 'createdAt'>) => void;
  updateEmployee: (empId: string, patch: Partial<Omit<Employee, 'id'>>) => void;
  removeEmployee: (empId: string) => void;

  // Notifications
  addNotification: (msg: string, type?: Notification['type'], link?: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Toast
  setToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  clearToast: () => void;

  // Utils
  resetStore: () => void;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', employeeNo: 'EMP-2023-001', name: '김개발', email: 'kim.dev@heyzzabi.com', phone: '010-1234-5601', role: 'Frontend', department: '개발팀', position: '대리', skills: ['React', 'TypeScript', 'CSS'], certifications: ['정보처리기사'], pastProjects: ['로그인 시스템 리뉴얼', 'API 연동 모듈'], currentWorkload: 70, avatar: '김', level: 'member', status: 'ACTIVE', hireDate: '2023-03-02', lastLoginAt: '2026-08-12 09:12', createdAt: '2023-03-02' },
  { id: 'e2', employeeNo: 'EMP-2021-014', name: '박서버', email: 'park.server@heyzzabi.com', phone: '010-1234-5602', role: 'Backend', department: '개발팀', position: '과장', skills: ['Node.js', 'Python', 'PostgreSQL', 'AWS'], certifications: ['AWS SAA', '정보처리기사'], pastProjects: ['API 서버 구축', 'DB 최적화 프로젝트'], currentWorkload: 40, avatar: '박', level: 'lead', status: 'ACTIVE', hireDate: '2021-07-19', lastLoginAt: '2026-08-13 08:45', createdAt: '2021-07-19' },
  { id: 'e3', employeeNo: 'EMP-2022-032', name: '이디자인', email: 'lee.design@heyzzabi.com', phone: '010-1234-5603', role: 'UI/UX Designer', department: '디자인팀', position: '사원', skills: ['Figma', 'Illustrator', 'Prototyping'], certifications: ['GTQ'], pastProjects: ['모바일앱 디자인', '브랜드 가이드라인'], currentWorkload: 55, avatar: '이', level: 'member', status: 'ACTIVE', hireDate: '2022-05-10', lastLoginAt: '2026-08-11 17:30', createdAt: '2022-05-10' },
  { id: 'e4', employeeNo: 'EMP-2019-003', name: '최PM', email: 'choi.pm@heyzzabi.com', phone: '010-1234-5604', role: 'Project Manager', department: '기획팀', position: '부장', skills: ['Agile', 'JIRA', 'Roadmapping'], certifications: ['PMP'], pastProjects: ['V1.0 런치', '파이프라인 기획'], currentWorkload: 90, avatar: '최', level: 'pm', status: 'ACTIVE', hireDate: '2019-01-14', lastLoginAt: '2026-08-13 09:02', createdAt: '2019-01-14' },
];

const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: '[주간회의] Hey Zzabi AI 파이프라인 개편 논의',
    date: '2026. 08. 12',
    summary: [
      'AI 4단계 업무 파이프라인 기획서 초안 작성 필요',
      'UI/UX 디자인 통일 작업 - 전체 화면 일관성 점검',
      'Neo4j 기반 코드 영향 분석 모듈 검토 및 도입 결정',
      '신규 팀원 온보딩 자동화 기능 우선순위 논의',
      'Q3 스프린트 일정 최종 확정',
    ],
    hasProposal: false,
    isProposalApproved: false,
    isProposalRejected: false,
    isTasksExtracted: false,
    extractedTasks: [],
  },
  {
    id: 'm2',
    title: '[긴급회의] 사용자 인증 버그 대응',
    date: '2026. 08. 10',
    summary: [
      '소셜 로그인 토큰 만료 버그 원인 파악 완료 (JWT 갱신 로직 오류)',
      '핫픽스 배포 일정: 8월 10일 자정',
      '재발 방지를 위한 테스트 커버리지 확대 필요',
      '사용자 공지 문구 작성 및 CS팀 공유',
    ],
    hasProposal: true,
    proposalContent: `# [긴급 기획서] 사용자 인증 버그 대응\n\n## 1. 배경\nJWT 토큰 갱신 로직 오류로 인해 소셜 로그인 사용자 일부가 인증 실패 현상 발생.\n\n## 2. 대응 계획\n- 핫픽스: refreshToken 만료 시 재발급 로직 수정\n- QA: 전체 인증 플로우 회귀 테스트\n- 사용자 공지: 점검 완료 후 CS팀 통해 배포\n\n## 3. 기대 효과\n- 인증 실패율 0% 달성\n- 사용자 신뢰도 회복`,
    isProposalApproved: false,
    isProposalRejected: false,
    isTasksExtracted: false,
    extractedTasks: [],
    analysis: {
      agenda: ['소셜 로그인 토큰 만료 버그 원인 파악', 'Q3 핫픽스 배포 일정 결정', '재발 방지 방안 논의'],
      decisions: ['JWT 갱신 로직 즉시 수정 (8/10 자정 배포)', '테스트 커버리지 80% 이상 확대', 'CS팀 사전 공유'],
      actionItems: ['refreshToken 갱신 로직 수정 (박서버)', '회귀 테스트 작성 (김개발)', '사용자 공지 문구 작성 (이디자인)', 'CS팀 공유 문서 작성 (최PM)'],
    },
  },
];

function generateAnalysis(summary: string[]): StructuredAnalysis {
  return {
    agenda: summary.slice(0, Math.ceil(summary.length / 2)).map(s => s.replace(/^\d+\.\s*/, '')),
    decisions: [
      `${summary[0]?.replace(/^\d+\.\s*/, '').split(' ').slice(0, 4).join(' ')} 건 진행 확정`,
      '다음 스프린트 내 완료 목표',
      '팀장 검토 후 최종 승인 진행',
    ],
    actionItems: summary.map(s => s.replace(/^\d+\.\s*/, '')),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  meetings: INITIAL_MEETINGS,
  tasks: [],
  employees: INITIAL_EMPLOYEES,
  notifications: [
    { id: 'n1', message: 'Hey Zzabi 파이프라인 엔진이 정상 가동 중입니다.', type: 'info', timestamp: '2026. 08. 12 09:00', read: false, link: '/dashboard' },
    { id: 'n2', message: '[긴급회의] 기획서가 자동 생성되었습니다. 검토해 주세요.', type: 'success', timestamp: '2026. 08. 10 14:30', read: true, link: '/meetings' },
  ],
  toast: null,

  fetchData: async () => {
    try {
      const [backendMeetings, backendSpecs, backendTasks] = await Promise.all([
        apiMeetings.list(),
        apiSpecs.list(),
        apiTasks.list(),
      ]);

      if (!Array.isArray(backendMeetings)) return; // If API completely fails

      const mappedTasks: Task[] = (backendTasks as any[]).map(t => ({
        id: `t_${t.id}`,
        title: t.task_title,
        source: t.spec_title,
        status: t.status === 'PENDING_APPROVAL' ? 'pending-distribution' : 'in-progress',
        assigneeId: `e_${t.assigned_user}`,
        estimatedHours: 8,
        progress: t.status === 'APPROVED' ? 10 : 0,
      }));

      const mappedMeetings: Meeting[] = (backendMeetings as any[]).map(m => {
        const spec = (backendSpecs as any[]).find(s => s.meeting === m.id);
        const relatedTasks = (backendTasks as any[]).filter(t => t.spec === spec?.id);
        
        return {
          id: `m_${m.id}`,
          title: m.title,
          date: new Date(m.created_at).toLocaleDateString(),
          summary: m.content ? m.content.split('\n') : ['(내용 없음)'],
          hasProposal: !!spec,
          isProposalApproved: spec?.status === 'REVIEWED',
          isProposalRejected: false,
          proposalContent: spec ? `# ${spec.title}\n${spec.summary}` : undefined,
          isTasksExtracted: relatedTasks.length > 0,
          extractedTasks: relatedTasks.map(t => `t_${t.id}`),
        };
      });

      set({ meetings: mappedMeetings, tasks: mappedTasks });
    } catch (err) {
      console.warn('API Fetch failed, using mock data fallback.', err);
    }
  },

  addMeeting: async (meeting) => {
    try {
      await apiMeetings.create({
        title: meeting.title,
        content: meeting.summary.join('\n'),
        status: 'DRAFT',
      });
      get().fetchData();
      get().setToast('회의록이 성공적으로 등록되었습니다.', 'success');
    } catch (err) {
      console.warn('API failed', err);
      // Fallback
      set((state) => ({
        meetings: [{
          ...meeting,
          id: `m_${Date.now()}`,
          hasProposal: false,
          isProposalApproved: false,
          isProposalRejected: false,
          isTasksExtracted: false,
          extractedTasks: [],
        }, ...state.meetings],
      }));
    }
  },

  deleteMeeting: (meetingId) => set((state) => ({
    meetings: state.meetings.filter(m => m.id !== meetingId),
    toast: { message: '회의록이 삭제되었습니다.', type: 'info' },
  })),

  generateProposal: async (meetingId) => {
    // API 명세: 회의록 상태를 REVIEWED로 변경하고 백그라운드 태스크로 기획서 자동 생성 시작
    try {
      const numericId = parseInt(meetingId.replace('m_', ''));
      if (!isNaN(numericId)) {
        await apiMeetings.reviewComplete(numericId);
        get().setToast('기획서 자동 생성이 시작되었습니다.', 'success');
        // 주기적으로 fetch 하거나 잠시 후 fetch
        setTimeout(() => get().fetchData(), 3000);
      }
    } catch (err) {
      console.warn('API failed', err);
    }

    set((state) => {
    const meeting = state.meetings.find(m => m.id === meetingId);
    if (!meeting) return {};
    const analysis = generateAnalysis(meeting.summary);
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `'${meeting.title}' 기획서 초안이 생성되었습니다. 검토 후 확정해 주세요.`,
      type: 'success',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/meetings',
    };
    return {
      meetings: state.meetings.map(m =>
        m.id === meetingId ? {
          ...m,
          hasProposal: true,
          isProposalRejected: false,
          proposalRejectedReason: undefined,
          analysis,
          proposalContent: `# [기획서] ${m.title}\n\n## 1. 배경 및 목적\n회의에서 논의된 내용을 기반으로 자동 작성된 기획서입니다.\n\n## 2. 주요 안건 요약\n${analysis.agenda.map(a => `- ${a}`).join('\n')}\n\n## 3. 결정사항\n${analysis.decisions.map(d => `- ${d}`).join('\n')}\n\n## 4. 핵심 요구사항 (Action Items)\n${analysis.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n## 5. 기대 효과\n- 업무 병목 해소 및 팀 생산성 향상\n- 명확한 R&R 분리로 과부하 방지\n- 파이프라인 자동화를 통한 의사결정 속도 2배 개선\n\n## 6. 일정 계획\n- 1주차: 기획서 확정 및 공유\n- 2주차: 개발 착수\n- 3주차: QA 및 스테이징 배포\n- 4주차: 프로덕션 배포 및 모니터링`,
        } : m
      ),
      notifications: [notif, ...state.notifications],
      toast: { message: 'AI 기획서 초안이 생성되었습니다. 내용을 검토해 주세요.', type: 'success' },
    };
    });
  },

  editProposal: (meetingId, content) => set((state) => ({
    meetings: state.meetings.map(m => m.id === meetingId ? { ...m, proposalContent: content } : m),
  })),

  rejectProposal: (meetingId, reason) => set((state) => {
    const meeting = state.meetings.find(m => m.id === meetingId);
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `'${meeting?.title}' 기획서가 반려되었습니다. 사유: ${reason}`,
      type: 'warning',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/meetings',
    };
    return {
      meetings: state.meetings.map(m =>
        m.id === meetingId ? {
          ...m,
          hasProposal: false,
          isProposalRejected: true,
          proposalRejectedReason: reason,
        } : m
      ),
      notifications: [notif, ...state.notifications],
      toast: { message: '기획서가 반려되었습니다. 회의록을 수정 후 재요청하세요.', type: 'warning' },
    };
  }),

  downloadPPT: async (meetingId: string) => {
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
      console.error(e);
      set({ toast: { message: 'PPT 생성 중 오류가 발생했습니다.', type: 'error' } });
    }
  },

  approveProposalAndExtractTasks: async (meetingId) => {
    const meeting = get().meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    try {
      // Find spec ID from meetings (if backend mapped properly, we would store spec ID in meeting)
      // For now, assume it works and fetch data after.
      // 2-1 기획서 검토완료 버튼 클릭 시 호출
      // Need spec ID. Let's just fallback to mock for now since we don't store spec ID cleanly in store.
    } catch (err) {
      console.warn('API failed', err);
    }

    const taskTemplates = [
      { suffix: '기획서 최종 확정 및 공유', hours: 2, diff: 'Low' as const },
      { suffix: 'UI/UX 디자인 시안 작성', hours: 8, diff: 'High' as const },
      { suffix: '백엔드 API 설계 및 구현', hours: 12, diff: 'High' as const },
      { suffix: '프론트엔드 연동 및 단위 테스트', hours: 6, diff: 'Medium' as const },
      { suffix: 'QA 및 버그 수정', hours: 4, diff: 'Medium' as const },
    ];

    const baseTitle = meeting.title.replace(/\[.*?\]\s*/, '');
    const newTasks: Task[] = taskTemplates.map((t, i) => ({
      id: `t_${Date.now()}_${i}`,
      title: `${baseTitle} - ${t.suffix}`,
      source: meeting.title,
      estimatedHours: t.hours,
      difficulty: t.diff,
      status: 'pending-distribution',
      progress: 0,
    }));

    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `'${meeting.title}'에서 ${newTasks.length}개 업무가 배분 대기열에 추가되었습니다.`,
      type: 'success',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/pipeline',
    };

    set((state) => ({
      meetings: state.meetings.map(m =>
        m.id === meetingId ? { ...m, isProposalApproved: true, isTasksExtracted: true, extractedTasks: newTasks.map(t => t.id) } : m
      ),
      tasks: [...newTasks, ...state.tasks],
      notifications: [notif, ...state.notifications],
      toast: { message: `${newTasks.length}개의 업무가 파이프라인 배분 대기열에 추가되었습니다.`, type: 'success' },
    }));
  },

  approveDistribution: async (taskId, newAssigneeId) => {
    try {
      const numericId = parseInt(taskId.replace('t_', ''));
      if (!isNaN(numericId)) {
        // 백엔드 API 명세에 단일 승인은 없고 다건 승인(approve-all)이 있음
        await apiTasks.approveAll({ task_ids: [numericId] });
        get().fetchData();
      }
    } catch (err) {
      console.warn('API failed', err);
    }

    set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    const emp = state.employees.find(e => e.id === newAssigneeId);
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `[결재 승인] '${task?.title}'이(가) ${emp?.name}님에게 배정되었습니다.`,
      type: 'success',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/approvals',
    };
    return {
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'in-progress', assigneeId: newAssigneeId, progress: 5, rejectedReason: undefined } : t
      ),
      employees: state.employees.map(e =>
        e.id === newAssigneeId ? { ...e, currentWorkload: Math.min(100, e.currentWorkload + (task?.estimatedHours || 4) * 3) } : e
      ),
      notifications: [notif, ...state.notifications],
      toast: { message: `[결재 완료] '${task?.title}'이(가) ${emp?.name}님에게 최종 배정되었습니다.`, type: 'success' },
    };
    });
  },

  rejectDistribution: (taskId, reason) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `[배분 반려] '${task?.title}' 배분이 반려되었습니다. 사유: ${reason}`,
      type: 'warning',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/approvals',
    };
    return {
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'pending-distribution', rejectedReason: reason } : t
      ),
      notifications: [notif, ...state.notifications],
      toast: { message: '배분이 반려되었습니다. 담당자를 재검토해 주세요.', type: 'warning' },
    };
  }),

  reportDelay: (taskId, reason) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `⚠️ '${task?.title}' 지연 감지. 사유: ${reason}`,
      type: 'warning',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/pipeline',
    };
    return {
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'delayed', delayReason: reason } : t),
      notifications: [notif, ...state.notifications],
      toast: { message: '지연이 감지되어 기록되었습니다. AI 재조정을 실행하세요.', type: 'warning' },
    };
  }),

  reallocateTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    const bestEmp = [...state.employees]
      .filter(e => e.id !== task?.assigneeId)
      .sort((a, b) => a.currentWorkload - b.currentWorkload)[0] || state.employees[0];
    const notif: Notification = {
      id: `n_${Date.now()}`,
      message: `[AI 재조정] '${task?.title}'이(가) ${bestEmp.name}님으로 재배정되었습니다.`,
      type: 'success',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/pipeline',
    };
    return {
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status: 'in-progress', assigneeId: bestEmp.id, delayReason: undefined } : t
      ),
      employees: state.employees.map(e =>
        e.id === bestEmp.id ? { ...e, currentWorkload: Math.min(100, e.currentWorkload + 10) } : e
      ),
      notifications: [notif, ...state.notifications],
      toast: { message: `[AI 재조정] ${bestEmp.name}님으로 재배정 완료`, type: 'success' },
    };
  }),

  updateTaskStatus: (taskId, status) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    const notif: Notification | null = status === 'shipped' ? {
      id: `n_${Date.now()}`,
      message: `✅ '${task?.title}' 완료 처리 — 결재함에 기록되었습니다.`,
      type: 'success',
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link: '/approvals',
    } : null;
    return {
      tasks: state.tasks.map(t =>
        t.id === taskId ? {
          ...t,
          status,
          ...(status === 'shipped' ? { progress: 100, completedAt: new Date().toLocaleDateString('ko-KR') } : {})
        } : t
      ),
      notifications: notif ? [notif, ...state.notifications] : state.notifications,
      toast: status === 'shipped' ? { message: '업무가 완료 처리되어 결재함에 기록되었습니다.', type: 'success' } : null,
    };
  }),

  updateTaskProgress: (taskId, progress) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, progress: Math.max(0, Math.min(100, progress)) } : t),
  })),

  addEmployee: (emp) => set((state) => {
    const seq = state.employees.length + 1;
    const employeeNo = `EMP-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
    return {
      employees: [...state.employees, {
        ...emp,
        id: `e_${Date.now()}`,
        employeeNo,
        currentWorkload: 0,
        avatar: emp.name[0],
        createdAt: new Date().toISOString().slice(0, 10),
      }],
      toast: { message: `${emp.name}님이 팀에 등록되었습니다. (사원번호: ${employeeNo})`, type: 'success' },
    };
  }),

  updateEmployee: (empId, patch) => set((state) => {
    const target = state.employees.find(e => e.id === empId);
    return {
      employees: state.employees.map(e => e.id === empId ? { ...e, ...patch, avatar: patch.name ? patch.name[0] : e.avatar } : e),
      toast: target ? { message: `${target.name}님의 정보가 수정되었습니다.`, type: 'success' } : null,
    };
  }),

  removeEmployee: (empId) => set((state) => ({
    employees: state.employees.filter(e => e.id !== empId),
    toast: { message: '팀원이 삭제되었습니다.', type: 'info' },
  })),

  addNotification: (msg, type = 'info', link) => set((state) => ({
    notifications: [{
      id: `n_${Date.now()}`,
      message: msg,
      type,
      timestamp: new Date().toLocaleString('ko-KR'),
      read: false,
      link,
    }, ...state.notifications],
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),

  clearNotifications: () => set({ notifications: [] }),

  setToast: (msg, type = 'info') => set({ toast: { message: msg, type } }),
  clearToast: () => set({ toast: null }),

  resetStore: () => set({
    meetings: INITIAL_MEETINGS,
    tasks: [],
    employees: INITIAL_EMPLOYEES,
    notifications: [],
    toast: { message: '모든 데이터가 초기화되었습니다.', type: 'info' },
  }),
}));
