import axios, { AxiosError } from 'axios';
import type {
  DashboardGlobal,
  DashboardProject,
  Member,
  ProjectDetail,
  ProjectSummary,
  Role,
  Status,
  Task,
  User,
} from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'ttm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: string; details?: unknown }>) => {
    if (err.response?.status === 401) {
      setToken(null);
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  },
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  return 'Something went wrong';
}

// ---------- Auth ----------
export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/api/auth/signup', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/api/auth/login', data).then((r) => r.data),
  me: () => api.get<{ user: User }>('/api/auth/me').then((r) => r.data.user),
};

// ---------- Projects ----------
export const projectsApi = {
  list: () =>
    api.get<{ projects: ProjectSummary[] }>('/api/projects').then((r) => r.data.projects),
  get: (id: string) =>
    api.get<{ project: ProjectDetail }>(`/api/projects/${id}`).then((r) => r.data.project),
  create: (data: { name: string; description?: string }) =>
    api.post<{ project: { id: string } }>('/api/projects', data).then((r) => r.data.project),
  delete: (id: string) => api.delete(`/api/projects/${id}`).then(() => undefined),
};

// ---------- Members ----------
export const membersApi = {
  list: (projectId: string) =>
    api
      .get<{ members: Member[] }>(`/api/projects/${projectId}/members`)
      .then((r) => r.data.members),
  add: (projectId: string, data: { email: string; role: Role }) =>
    api
      .post<{ member: Member }>(`/api/projects/${projectId}/members`, data)
      .then((r) => r.data.member),
  updateRole: (projectId: string, userId: string, role: Role) =>
    api
      .patch<{ member: Member }>(`/api/projects/${projectId}/members/${userId}`, { role })
      .then((r) => r.data.member),
  remove: (projectId: string, userId: string) =>
    api.delete(`/api/projects/${projectId}/members/${userId}`).then(() => undefined),
};

// ---------- Tasks ----------
export const tasksApi = {
  list: (projectId: string, filters?: { status?: Status; assignedToId?: string; overdue?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.assignedToId) params.set('assignedToId', filters.assignedToId);
    if (filters?.overdue) params.set('overdue', 'true');
    return api
      .get<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`, { params })
      .then((r) => r.data.tasks);
  },
  create: (
    projectId: string,
    data: Partial<Task> & { title: string },
  ) =>
    api
      .post<{ task: Task }>(`/api/projects/${projectId}/tasks`, data)
      .then((r) => r.data.task),
  update: (taskId: string, data: Partial<Task>) =>
    api.patch<{ task: Task }>(`/api/tasks/${taskId}`, data).then((r) => r.data.task),
  remove: (taskId: string) => api.delete(`/api/tasks/${taskId}`).then(() => undefined),
};

// ---------- Dashboards ----------
export const dashboardApi = {
  global: () => api.get<DashboardGlobal>('/api/dashboard').then((r) => r.data),
  project: (projectId: string) =>
    api.get<DashboardProject>(`/api/projects/${projectId}/dashboard`).then((r) => r.data),
};
