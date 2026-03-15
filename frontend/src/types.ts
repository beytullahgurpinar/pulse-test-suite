export interface Project {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Environment {
  id: number;
  projectId: number;
  name: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnvVar {
  id: number;
  projectId: number;
  environmentId: number;
  name: string;
  value: string;
  secured?: boolean;
}

export interface Assertion {
  id?: number;
  testRequestId?: number;
  type: 'status' | 'json_path' | 'response_time' | 'header' | 'json_schema';
  key: string;
  operator: string;
  expectedValue: string;
}

export interface Category {
  id: number;
  projectId: number;
  parentId?: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestRequest {
  id?: number;
  projectId: number;
  categoryId?: number | null;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  retryCount?: number;
  assertions: Assertion[];
}

export interface AssertionResult {
  assertionId: number;
  type: string;
  key: string;
  passed: boolean;
  expected: string;
  actual: string;
  message: string;
}

export interface RequestSnapshot {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface RunResult {
  passed: boolean;
  statusCode: number;
  responseBody: string;
  durationMs: number;
  assertionResults: AssertionResult[];
  error?: string;
  runId?: number;
  request?: RequestSnapshot;
}

export interface TestRun {
  id: number;
  testRequestId: number;
  status: string;
  statusCode: number;
  responseBody: string;
  durationMs: number;
  errorMessage: string;
  assertionResults: string;
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: string;
  requestBody?: string;
  scheduleId?: number;
  createdAt: string;
}

// Dashboard
export interface DashboardData {
  totalTests: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  avgDuration: number;
  successRate: number;
  recentRuns: RecentRun[];
  projectStats: ProjectStats[];
  activeSchedules: number;
}

export interface RecentRun {
  id: number;
  testName: string;
  status: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
  scheduleId?: number;
}

export interface ProjectStats {
  projectId: number;
  projectName: string;
  testCount: number;
  runCount: number;
  passCount: number;
  failCount: number;
  avgDuration: number;
}

// Schedules
export interface Schedule {
  id?: number;
  projectId: number;
  name: string;
  intervalMins: number;
  enabled: boolean;
  runAllTests: boolean;
  testRequestId?: number;
  flowId?: number;
  environmentId?: number;
  webhookUrl: string;
  notifyOnFail: boolean;
  notifyOnSuccess: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Flows
export interface FlowStep {
  id?: number;
  flowId?: number;
  testRequestId: number;
  orderNum: number;
  extractions: Record<string, any>;
}

export interface Flow {
  id?: number;
  projectId: number;
  name: string;
  steps: FlowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlowRunStep {
  id: number;
  flowRunId: number;
  flowStepId: number;
  testRunId: number;
  testRun?: TestRun;
  status: string;
  extractedData: string;
  createdAt: string;
}

export interface FlowRun {
  id: number;
  flowId: number;
  status: string;
  durationMs: number;
  steps?: FlowRunStep[];
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

