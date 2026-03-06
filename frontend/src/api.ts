import type {
  TestRequest, RunResult, TestRun, Project, EnvVar, DashboardData,
  Schedule, Category, Flow, FlowRun, PaginatedResponse
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers
    },
  });
  if (res.status === 401) {
    const errData = await res.json().catch(() => ({}));
    console.error('Auth check failed:', path, errData.error || 'Unauthorized');
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Categories
  listCategories: (projectId: number) =>
    fetchApi<Category[]>(`/categories?projectId=${projectId}`),
  createCategory: (data: { projectId: number; name: string; parentId?: number | null }) =>
    fetchApi<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name: string; parentId?: number | null }) =>
    fetchApi<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    fetchApi<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),

  // Projects
  listProjects: () => fetchApi<Project[]>('/projects'),
  createProject: (data: { name: string }) =>
    fetchApi<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: { name: string }) =>
    fetchApi<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) =>
    fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Env Vars
  listEnvVars: (projectId: number) =>
    fetchApi<EnvVar[]>(`/env-vars?projectId=${projectId}`),
  getEnvVar: (id: number) => fetchApi<EnvVar>(`/env-vars/${id}`),
  createEnvVar: (data: { projectId: number; name: string; value: string; secured?: boolean }) =>
    fetchApi<EnvVar>('/env-vars', { method: 'POST', body: JSON.stringify(data) }),
  updateEnvVar: (id: number, data: { name: string; value: string; secured?: boolean }) =>
    fetchApi<EnvVar>(`/env-vars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEnvVar: (id: number) =>
    fetchApi<{ message: string }>(`/env-vars/${id}`, { method: 'DELETE' }),

  // Tests
  listTests: (projectId?: number) =>
    fetchApi<TestRequest[]>(`/tests${projectId ? `?projectId=${projectId}` : ''}`),
  getTest: (id: number) => fetchApi<TestRequest>(`/tests/${id}`),
  createTest: (data: Partial<TestRequest>) =>
    fetchApi<TestRequest>('/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: number, data: Partial<TestRequest>) =>
    fetchApi<TestRequest>(`/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: number) =>
    fetchApi<{ message: string }>(`/tests/${id}`, { method: 'DELETE' }),
  duplicateTest: (id: number) =>
    fetchApi<TestRequest>(`/tests/${id}/duplicate`, { method: 'POST' }),
  runTest: (id: number) =>
    fetchApi<RunResult>(`/tests/${id}/run`, { method: 'POST' }),
  runAllTests: (projectId?: number) =>
    fetchApi<{ results: Array<RunResult & { testId: number; testName: string }> }>(
      `/tests/run-all${projectId ? `?projectId=${projectId}` : ''}`,
      { method: 'POST' }
    ),
  listRuns: (testId?: number, page: number = 1, limit: number = 20, projectId?: number) =>
    fetchApi<PaginatedResponse<TestRun>>(`/runs?page=${page}&limit=${limit}${testId ? `&testId=${testId}` : ''}${projectId ? `&projectId=${projectId}` : ''}`),
  getRun: (id: number) =>
    fetchApi<RunResult & { createdAt?: string }>(`/runs/${id}`),

  // Dashboard
  getDashboard: () => fetchApi<DashboardData>('/dashboard'),

  // Schedules
  listSchedules: (projectId?: number) =>
    fetchApi<Schedule[]>(`/schedules${projectId ? `?projectId=${projectId}` : ''}`),
  createSchedule: (data: Partial<Schedule>) =>
    fetchApi<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: number, data: Partial<Schedule>) =>
    fetchApi<Schedule>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: number) =>
    fetchApi<{ message: string }>(`/schedules/${id}`, { method: 'DELETE' }),
  toggleSchedule: (id: number) =>
    fetchApi<Schedule>(`/schedules/${id}/toggle`, { method: 'POST' }),

  // Flows
  listFlows: (projectId: number) =>
    fetchApi<Flow[]>(`/flows?projectId=${projectId}`),
  getFlow: (id: number) =>
    fetchApi<Flow>(`/flows/${id}`),
  createFlow: (data: Partial<Flow>) =>
    fetchApi<Flow>('/flows', { method: 'POST', body: JSON.stringify(data) }),
  updateFlow: (id: number, data: Partial<Flow>) =>
    fetchApi<Flow>(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFlow: (id: number) =>
    fetchApi<{ message: string }>(`/flows/${id}`, { method: 'DELETE' }),
  runFlow: (id: number) =>
    fetchApi<FlowRun>(`/flows/${id}/run`, { method: 'POST' }),
  listFlowRuns: (flowId?: number, page: number = 1, limit: number = 20) =>
    fetchApi<PaginatedResponse<FlowRun>>(`/flows/runs?page=${page}&limit=${limit}${flowId ? `&flowId=${flowId}` : ''}`),
  getFlowRun: (id: number) =>
    fetchApi<FlowRun>(`/flows/runs/${id}`),

  // Auth
  getMe: () => fetchApi<{ id: number; email: string; name: string; avatar: string; role: string; lastProjectId?: number | null; workspace: any }>('/auth/me'),
  updateLastProject: (projectId: number) =>
    fetchApi<{ message: string }>('/auth/me/last-project', { method: 'POST', body: JSON.stringify({ projectId }) }),

  // User management (admin only)
  listUsers: () => fetchApi<Array<{ id: number; email: string; name: string; avatar: string; role: string; isSelf: boolean; createdAt: string }>>('/users'),
  updateUser: (id: number, data: { role: string }) =>
    fetchApi<{ message: string }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    fetchApi<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),

  // Invitations (admin only)
  listInvitations: () => fetchApi<Array<{ id: number; email: string; role: string; token: string; used: boolean; createdAt: string }>>('/invitations'),
  createInvitation: (data: { email: string; role: string }) =>
    fetchApi<{ id: number; email: string; role: string; token: string; createdAt: string }>('/invitations', { method: 'POST', body: JSON.stringify(data) }),
  deleteInvitation: (id: number) =>
    fetchApi<{ message: string }>(`/invitations/${id}`, { method: 'DELETE' }),
};
