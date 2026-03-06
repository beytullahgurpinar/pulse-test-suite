import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Sheet,
  CircularProgress,
} from '@mui/joy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { RunResult } from '../types';

type ResultItem = RunResult & { testId: number; testName: string; runId?: number };

interface Props {
  results: ResultItem[] | null;
  loading?: boolean;
}

export function TestResultsCards({ results, loading }: Props) {

  if (!results && !loading) return null;
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size="lg" />
      </Box>
    );
  }
  if (!results || results.length === 0) return null;

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  const allPassed = failedCount === 0;

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Summary banner */}
        <Box
          sx={{
            borderRadius: 'xl',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: allPassed
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
            boxShadow: allPassed
              ? '0 8px 32px rgba(16, 185, 129, 0.3)'
              : '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {allPassed ? (
              <CheckCircleIcon sx={{ fontSize: 36, color: 'white' }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 36, color: 'white' }} />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography level="h4" sx={{ color: 'white', fontWeight: 800, mb: 0.5 }}>
              {allPassed ? 'All Tests Passed' : 'Some Tests Failed'}
            </Typography>
            <Typography level="body-lg" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              {allPassed
                ? `${passedCount} test${passedCount > 1 ? 's' : ''} completed successfully`
                : `${passedCount} passed, ${failedCount} failed`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip size="lg" variant="soft" color="success" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}>
              {passedCount} Passed
            </Chip>
            {failedCount > 0 && (
              <Chip size="lg" variant="soft" color="danger" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }}>
                {failedCount} Failed
              </Chip>
            )}
          </Box>
        </Box>

        {/* Result cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {results.map((r, i) => (
            <Sheet
              key={i}
              variant="outlined"
              sx={{
                borderRadius: 'lg',
                border: '1px solid',
                borderColor: r.passed ? 'success.outlinedBorder' : 'danger.outlinedBorder',
                overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  borderColor: r.passed ? 'success.400' : 'danger.400',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: r.passed ? 'success.softBg' : 'danger.softBg',
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 'lg',
                    bgcolor: r.passed ? 'success.softBg' : 'danger.softBg',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {r.passed ? (
                    <CheckCircleIcon sx={{ fontSize: 24, color: 'success.700' }} />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 24, color: 'danger.700' }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography level="title-md" fontWeight={700}>
                    {r.testName}
                  </Typography>
                  <Typography level="body-sm" textColor="neutral.500">
                    {r.statusCode} · {r.durationMs}ms
                  </Typography>
                </Box>
                <Chip
                  size="lg"
                  variant="soft"
                  color={r.passed ? 'success' : 'danger'}
                  sx={{ fontWeight: 700 }}
                >
                  {r.passed ? 'Passed' : 'Failed'}
                </Chip>
                {r.runId ? (
                  <Button
                    size="sm"
                    variant="outlined"
                    component={Link}
                    to={`/runs/${r.runId}?testName=${encodeURIComponent(r.testName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    startDecorator={<VisibilityIcon />}
                    sx={{ fontWeight: 600 }}
                  >
                    Details
                  </Button>
                ) : null}
              </Box>
            </Sheet>
          ))}
        </Box>
      </Box>
    </>
  );
}
