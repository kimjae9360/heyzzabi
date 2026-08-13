// src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export type MeetingStatus = 'DRAFT' | 'REVIEWED';

export interface BackendMeetingNote {
  id: number;
  title: string;
  content: string;
  status: MeetingStatus;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export type SpecStatus = 'GENERATING' | 'COMPLETED' | 'REVIEWED';

export interface BackendSpecDocument {
  id: number;
  meeting: number;
  meeting_title: string;
  title: string;
  summary: string;
  file: string | null;
  status: SpecStatus;
  created_at: string;
}

export type TaskStatus = 'PENDING_APPROVAL' | 'APPROVED';

export interface BackendTaskAssignment {
  id: number;
  spec: number;
  spec_title: string;
  assigned_user: number;
  assigned_user_name: string;
  assigned_user_email: string;
  task_title: string;
  task_description: string;
  status: TaskStatus;
  created_at: string;
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // credentials: 'omit', // 로컬 목업 연동시 CORS 에러 방지를 위해 일단 omit
  });

  if (!response.ok) {
    if (response.status === 204) return {} as T;
    let errMessage = 'API Request Failed';
    try {
      const err = await response.json();
      errMessage = JSON.stringify(err);
    } catch (e) {
      errMessage = response.statusText;
    }
    throw new Error(errMessage);
  }
  
  if (response.status === 204) return {} as T;
  return response.json();
}

// Meetings API
export const apiMeetings = {
  list: () => fetchWithAuth<BackendMeetingNote[]>('/meetings/'),
  retrieve: (id: number) => fetchWithAuth<BackendMeetingNote>(`/meetings/${id}/`),
  create: (data: Partial<BackendMeetingNote>) => fetchWithAuth<BackendMeetingNote>('/meetings/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<BackendMeetingNote>) => fetchWithAuth<BackendMeetingNote>(`/meetings/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  partialUpdate: (id: number, data: Partial<BackendMeetingNote>) => fetchWithAuth<BackendMeetingNote>(`/meetings/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  destroy: (id: number) => fetchWithAuth<void>(`/meetings/${id}/`, { method: 'DELETE' }),
  reviewComplete: (id: number) => fetchWithAuth<BackendMeetingNote>(`/meetings/${id}/review-complete/`, { method: 'POST' }),
};

// Specs API
export const apiSpecs = {
  list: () => fetchWithAuth<BackendSpecDocument[]>('/specs/'),
  retrieve: (id: number) => fetchWithAuth<BackendSpecDocument>(`/specs/${id}/`),
  download: (id: number) => fetchWithAuth<BackendSpecDocument>(`/specs/${id}/download/`),
  reviewComplete: (id: number) => fetchWithAuth<BackendSpecDocument>(`/specs/${id}/review-complete/`, { method: 'POST' }),
};

// Tasks API
export const apiTasks = {
  list: () => fetchWithAuth<BackendTaskAssignment[]>('/tasks/'),
  retrieve: (id: number) => fetchWithAuth<BackendTaskAssignment>(`/tasks/${id}/`),
  create: (data: Partial<BackendTaskAssignment>) => fetchWithAuth<BackendTaskAssignment>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<BackendTaskAssignment>) => fetchWithAuth<BackendTaskAssignment>(`/tasks/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  partialUpdate: (id: number, data: Partial<BackendTaskAssignment>) => fetchWithAuth<BackendTaskAssignment>(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  destroy: (id: number) => fetchWithAuth<void>(`/tasks/${id}/`, { method: 'DELETE' }),
  approveAll: (tasksData?: any) => fetchWithAuth<BackendTaskAssignment>('/tasks/approve-all/', { 
    method: 'POST',
    body: JSON.stringify(tasksData || {})
  }),
  pending: () => fetchWithAuth<BackendTaskAssignment[]>('/tasks/pending/'),
};
