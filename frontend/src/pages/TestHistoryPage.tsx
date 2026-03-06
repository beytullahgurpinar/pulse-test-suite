import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Sheet,
  Table,
  Chip,
  CircularProgress,
} from '@mui/joy';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import type { TestRequest, TestRun } from '../types';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { DataTableWrapper, DataTablePagination, tableStyles } from '../components/DataTable';

function formatDateTime(s: string) {
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

export function TestHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const testId = id ? parseInt(id, 10) : null;

  const [test, setTest] = useState<TestRequest | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('limit') || '20', 10);

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setSearchParams(prev => {
      prev.set('limit', newSize.toString());
      prev.set('page', '0');
      return prev;
    });
  };

  useEffect(() => {
    if (!testId) {
      navigate('/p');
      return;
    }

    setLoading(true);
    api.getTest(testId)
      .then(setTest)
      .catch(() => navigate('/p'))
      .finally(() => setLoading(false));
  }, [testId, navigate]);

  useEffect(() => {
    if (!testId) return;

    setLoading(true);
    // page+1 because backend is 1-indexed, frontend is 0-indexed
    api.listRuns(testId, page + 1, pageSize)
      .then((res) => {
        setRuns(res.data);
        setTotalItems(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [testId, page, pageSize]);

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
        subtitle="History"
        description="Run history and results for this test"
        icon={<HistoryRoundedIcon sx={{ fontSize: 22 }} />}
      />

      <Box sx={{ px: 0, pb: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress size="lg" />
          </Box>
        ) : runs.length === 0 ? (
          <Sheet
            variant="outlined"
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: '12px',
              border: '2px dashed',
              borderColor: 'neutral.200',
              bgcolor: 'background.level1',
              '[data-joy-color-scheme="dark"] &': {
                borderColor: 'neutral.300',
              },
            }}
          >
            <Typography level="h4" fontWeight={700} sx={{ mb: 1 }}>
              No run history yet
            </Typography>
            <Typography level="body-md" sx={{ color: 'text.secondary' }}>
              Run this test to see results here
            </Typography>
          </Sheet>
        ) : (
          <DataTableWrapper
            pagination={
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            }
          >
            <Table sx={tableStyles}>
              <thead>
                <tr>
                  <th style={{ width: 48 }}></th>
                  <th style={{ minWidth: 180 }}>Date & Time</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 90 }}>Code</th>
                  <th style={{ width: 100 }}>Duration</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {run.status === 'passed' ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'success.500' }} />
                      ) : (
                        <ErrorRoundedIcon sx={{ fontSize: 20, color: 'danger.500' }} />
                      )}
                    </td>
                    <td>
                      <Typography level="body-sm" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                        {formatDateTime(run.createdAt)}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={run.status === 'passed' ? 'success' : 'danger'}
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      >
                        {run.status === 'passed' ? 'Passed' : 'Failed'}
                      </Chip>
                    </td>
                    <td>
                      <Typography
                        level="body-sm"
                        fontFamily="monospace"
                        fontWeight={700}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        {run.statusCode}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {run.durationMs}ms
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="outlined"
                        component="a"
                        href={`/runs/${run.id}?testName=${encodeURIComponent(test?.name || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        startDecorator={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          fontWeight: 600,
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          borderColor: 'neutral.300',
                          '[data-joy-color-scheme="dark"] &': {
                            borderColor: 'neutral.400',
                          },
                        }}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </DataTableWrapper>
        )}
      </Box>
    </>
  );
}
