import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Sheet,
  Table,
  Chip,
  CircularProgress,
} from '@mui/joy';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import type { TestRun, Project } from '../types';
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

export function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProjectId } = useOutletContext<{ projects: Project[]; currentProjectId: number | null }>();

  const [runs, setRuns] = useState<(TestRun & { testName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('limit') || '20', 10);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setSearchParams((prev) => {
      prev.set('limit', newSize.toString());
      prev.set('page', '0');
      return prev;
    });
  };

  useEffect(() => {
    if (!currentProjectId) return;
    setLoading(true);
    api
      .listRuns(undefined, page + 1, pageSize, currentProjectId)
      .then((res) => {
        setRuns(res.data ?? []);
        setTotalItems(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentProjectId, page, pageSize]);

  if (!currentProjectId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography level="body-lg" textColor="text.secondary">
          Select a project to view results
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="Test Results"
        subtitle={`${totalItems} total runs`}
        description="All test run history for this project"
        icon={<AssessmentRoundedIcon sx={{ fontSize: 22 }} />}
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
              No test results yet
            </Typography>
            <Typography level="body-md" sx={{ color: 'text.secondary' }}>
              Run some tests to see results here
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
                  <th style={{ width: 40 }}></th>
                  <th>Test Name</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 70 }}>Code</th>
                  <th style={{ width: 80 }}>Duration</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/runs/${run.id}?testName=${encodeURIComponent((run as any).testName || '')}`)}
                  >
                    <td>
                      {run.status === 'passed' ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'success.500' }} />
                      ) : (
                        <ErrorRoundedIcon sx={{ fontSize: 18, color: 'danger.500' }} />
                      )}
                    </td>
                    <td>
                      <Typography level="body-sm" fontWeight={600} noWrap>
                        {(run as any).testName || `Test #${run.testRequestId}`}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={run.status === 'passed' ? 'success' : 'danger'}
                        sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                      >
                        {run.status === 'passed' ? 'Pass' : 'Fail'}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-sm" fontFamily="monospace" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                        {run.statusCode}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {run.durationMs}ms
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-sm" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
                        {formatDateTime(run.createdAt)}
                      </Typography>
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
