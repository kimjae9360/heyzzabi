import { create } from 'zustand';

interface DashboardState {
  metrics: {
    totalProjects: number;
    activeProjects: number;
    meetingNotesThisMonth: number;
    tasksPending: number;
    tasksInProgress: number;
    tasksCompleted: number;
  };
  departmentProgress: {
    name: string;
    total: number;
    completed: number;
    progress: number;
  }[];
  bottlenecks: {
    department: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  // Action to simulate automation
  completeTask: (departmentName: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: {
    totalProjects: 24,
    activeProjects: 12,
    meetingNotesThisMonth: 48,
    tasksPending: 5,
    tasksInProgress: 18,
    tasksCompleted: 42,
  },
  departmentProgress: [
    { name: '개발 부서', total: 50, completed: 30, progress: 60 },
    { name: '기획 부서', total: 30, completed: 25, progress: 83 },
    { name: '경영지원', total: 20, completed: 18, progress: 90 },
    { name: '마케팅', total: 40, completed: 10, progress: 25 },
  ],
  bottlenecks: [
    { department: '마케팅', issue: '신규 캠페인 에셋 대기중', severity: 'high' },
    { department: '개발 부서', issue: 'QA 서버 배포 지연', severity: 'medium' },
  ],
  completeTask: (departmentName: string) =>
    set((state) => {
      // 1. Update department progress
      const updatedDepartments = state.departmentProgress.map((dept) => {
        if (dept.name === departmentName && dept.completed < dept.total) {
          const newCompleted = dept.completed + 1;
          return {
            ...dept,
            completed: newCompleted,
            progress: Math.round((newCompleted / dept.total) * 100),
          };
        }
        return dept;
      });

      // 2. Update global metrics automatically
      return {
        departmentProgress: updatedDepartments,
        metrics: {
          ...state.metrics,
          tasksCompleted: state.metrics.tasksCompleted + 1,
          tasksInProgress: Math.max(0, state.metrics.tasksInProgress - 1),
        },
      };
    }),
}));
