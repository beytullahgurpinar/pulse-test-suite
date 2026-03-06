import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Box } from '@mui/joy';
import EditNoteIcon from '@mui/icons-material/EditNote';
import type { Project } from '../types';
import { api } from '../api';
import { TestForm } from '../components/TestForm';
import { PageHeader } from '../components/PageHeader';

export function TestFormPage() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId, 10) : undefined;
  const testId = id ? parseInt(id, 10) : undefined;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedProjectId, setLoadedProjectId] = useState<number | undefined>(pid);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (testId && !pid) {
      api.getTest(testId).then((t) => setLoadedProjectId(t.projectId)).catch(() => { });
    } else {
      setLoadedProjectId(pid);
    }
  }, [testId, pid]);

  const projectIdForForm = pid ?? loadedProjectId;

  return (
    <>
      <PageHeader
        title={testId ? 'Edit Test' : 'New Test'}
        description={testId ? 'Update your API test configuration' : 'Create a new API test'}
        icon={<EditNoteIcon sx={{ fontSize: 24 }} />}
      />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ pt: 0 }}>
          <TestForm
            testId={testId}
            projectId={projectIdForForm}
            projects={projects}
            onSave={() => navigate(projectIdForForm ? `/p/${projectIdForForm}/tests` : '/dashboard')}
            onCancel={() => navigate(projectIdForForm ? `/p/${projectIdForForm}/tests` : '/dashboard')}
          />
        </Box>
      </Box>
    </>
  );
}
