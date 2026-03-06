import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { TestFormPage } from './pages/TestFormPage';
import { TestDetailPage } from './pages/TestDetailPage';
import { TestHistoryPage } from './pages/TestHistoryPage';
import { RunResultPage } from './pages/RunResultPage';
import { EnvPage } from './pages/EnvPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { FlowFormPage } from './pages/FlowFormPage';
import { FlowHistoryPage } from './pages/FlowHistoryPage';
import { FlowRunResultPage } from './pages/FlowRunResultPage';
import { TestsPage } from './pages/TestsPage';
import { FlowsPage } from './pages/FlowsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'p/:projectId/tests', element: <TestsPage /> },
      { path: 'p/:projectId/flows', element: <FlowsPage /> },
      { path: 'p/:projectId/schedules', element: <SchedulesPage /> },
      { path: 'p/:projectId/env', element: <EnvPage /> },
      { path: 'p/:projectId', element: <Navigate to="tests" replace /> },

      { path: 'projects', element: <ProjectsPage /> },
      { path: 'p/:projectId/tests/new', element: <TestFormPage /> },
      { path: 'p/:projectId/flows/new', element: <FlowFormPage /> },
      { path: 'p/:projectId/flows/:id/edit', element: <FlowFormPage /> },
      { path: 'p/:projectId/flows/:id/history', element: <FlowHistoryPage /> },
      { path: 'flows/runs/:runId', element: <FlowRunResultPage /> },
      { path: 'runs/:runId', element: <RunResultPage /> },
      { path: 'p/:projectId/tests/:id', element: <TestDetailPage /> },
      { path: 'p/:projectId/tests/:id/edit', element: <TestFormPage /> },
      { path: 'p/:projectId/tests/:id/history', element: <TestHistoryPage /> },
    ],
  },
]);
