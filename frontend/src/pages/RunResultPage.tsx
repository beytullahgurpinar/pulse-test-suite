import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Sheet, Chip, Typography } from '@mui/joy';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import { PageHeader } from '../components/PageHeader';
import type { RunResult } from '../types';
import { api } from '../api';
import { RunResults } from '../components/RunResults';

function formatDateTime(s: string | undefined): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return s;
  }
}

export function RunResultPage() {
  const { runId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rid = runId ? parseInt(runId, 10) : null;
  const testName = searchParams.get('testName') || undefined;

  const [result, setResult] = useState<(RunResult & { createdAt?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rid) {
      setLoading(true);
      setError('');
      api
        .getRun(rid)
        .then(setResult)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false));
    } else {
      navigate('/p');
    }
  }, [rid, navigate]);

  if (!rid) return null;

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <PageHeader
        title="Test Result"
        subtitle={testName}
        icon={<AssignmentRoundedIcon sx={{ fontSize: 22 }} />}
        actions={
          result?.createdAt ? (
            <Chip
              variant="outlined"
              color="neutral"
              size="lg"
              startDecorator={<ScheduleRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontWeight: 600,
                fontSize: '0.78rem',
                borderRadius: '8px',
                borderColor: 'neutral.300',
                '[data-joy-color-scheme="dark"] &': {
                  borderColor: 'neutral.400',
                },
              }}
            >
              {formatDateTime(result.createdAt)}
            </Chip>
          ) : undefined
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size="lg" />
        </Box>
      ) : error ? (
        <Sheet variant="soft" color="danger" sx={{ p: 4, borderRadius: '12px' }}>
          <Typography>{error}</Typography>
        </Sheet>
      ) : result ? (
        <Sheet
          variant="outlined"
          sx={{
            borderRadius: '12px',
            p: 3,
            border: '1px solid',
            borderColor: 'neutral.200',
            overflow: 'hidden',
            '[data-joy-color-scheme="dark"] &': {
              borderColor: 'neutral.300',
            },
          }}
        >
          <RunResults result={result} testName={testName} />
        </Sheet>
      ) : null}
    </Box>
  );
}
