import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import { PageHeader } from '../components/PageHeader';
import { EnvironmentSelect } from '../components/EnvironmentSelect';
import { useEnvironments } from '../hooks/useEnvironments';
import type { TestRequest, RunResult } from '../types';
import { api } from '../api';
import { RunResults } from '../components/RunResults';

export function TestDetailPage() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const testId = id ? parseInt(id, 10) : null;
  const pid = projectId ? parseInt(projectId, 10) : null;

  const [test, setTest] = useState<TestRequest | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  const { environments, selectedEnvId, setSelectedEnvId } = useEnvironments(pid);

  useEffect(() => {
    if (testId) {
      api.getTest(testId).then(setTest).catch(() => navigate('/p'));
    }
  }, [testId, navigate]);

  const handleRun = async () => {
    if (!testId) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.runTest(testId, selectedEnvId);
      setResult(res);
    } catch (e) {
      setResult({
        passed: false,
        statusCode: 0,
        responseBody: '',
        durationMs: 0,
        assertionResults: [],
        error: e instanceof Error ? e.message : 'Error',
      });
    } finally {
      setRunning(false);
    }
  };

  if (!test) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title={test.name}
        icon={<ScienceIcon sx={{ fontSize: 24 }} />}
        actions={
          <>
            <Button
              variant="outlined"
              startDecorator={<HistoryIcon />}
              onClick={() => navigate(`/p/${projectId}/tests/${testId}/history`)}
              sx={{ fontWeight: 600 }}
            >
              History
            </Button>
            <Button
              variant="outlined"
              startDecorator={<EditIcon />}
              onClick={() => navigate(`/p/${projectId}/tests/${testId}/edit`)}
              sx={{ fontWeight: 600 }}
            >
              Edit
            </Button>
            <EnvironmentSelect
              environments={environments}
              value={selectedEnvId}
              onChange={setSelectedEnvId}
            />
            <Button
              variant="soft"
              color="primary"
              startDecorator={running ? <CircularProgress size="sm" /> : <PlayArrowIcon />}
              onClick={handleRun}
              disabled={running}
              sx={{ fontWeight: 600 }}
            >
              {running ? 'Running...' : 'Run'}
            </Button>
          </>
        }
      />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ p: 3 }}>
          {result && (
            <RunResults result={result} testName={test.name} />
          )}
          {!result && (
            <Box sx={{ py: 4, textAlign: 'center', color: 'neutral.500' }}>
              Click the button above to run the test
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
