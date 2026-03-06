import {
  Typography,
  Box,
  Table,
  Chip,
  Alert,
  Sheet,
  Accordion,
  AccordionGroup,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
} from '@mui/joy';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import HttpRoundedIcon from '@mui/icons-material/HttpRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { RunResult, AssertionResult } from '../types';
import { JsonEditor } from './JsonEditor';
import { tableStyles } from './DataTable';

interface Props {
  result: RunResult;
  testName?: string;
}

function tryFormatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export function RunResults({ result, testName }: Props) {
  const passed = result.passed;
  const passedCount = result.assertionResults.filter((a) => a.passed).length;
  const totalCount = result.assertionResults.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Hero status banner */}
      <Box
        sx={{
          borderRadius: '12px',
          p: { xs: 3, md: 4 },
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          background: passed
            ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
            : 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
          boxShadow: passed
            ? '0 8px 32px rgba(16, 185, 129, 0.25)'
            : '0 8px 32px rgba(239, 68, 68, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {passed ? (
            <CheckCircleRoundedIcon sx={{ fontSize: 36, color: 'white' }} />
          ) : (
            <ErrorRoundedIcon sx={{ fontSize: 36, color: 'white' }} />
          )}
        </Box>
        <Box sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <Typography
            level="h3"
            sx={{
              color: 'white',
              fontWeight: 800,
              mb: 0.5,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.2rem', md: '1.5rem' },
            }}
          >
            {testName || 'Test'} {passed ? 'Passed' : 'Failed'}
          </Typography>
          <Typography
            level="body-md"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 500,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
            }}
          >
            {passed
              ? totalCount > 0
                ? `All ${totalCount} assertion${totalCount > 1 ? 's' : ''} passed successfully`
                : 'Request completed successfully'
              : result.error || (totalCount > 0 ? `${totalCount - passedCount} of ${totalCount} assertion(s) failed` : 'Request failed')}
          </Typography>
        </Box>
      </Box>

      {/* Stats row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, 1fr))' }, gap: 2 }}>
        <Card
          variant="outlined"
          sx={{
            border: '1px solid',
            borderColor: 'neutral.200',
            borderRadius: '10px',
            '--Card-padding': '16px',
            bgcolor: 'background.surface',
            '[data-joy-color-scheme="dark"] &': {
              borderColor: 'neutral.300',
            },
          }}
        >
          <CardContent orientation="horizontal" sx={{ gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '[data-joy-color-scheme="dark"] &': {
                  background: 'linear-gradient(135deg, rgba(76,110,245,0.2), rgba(76,110,245,0.1))',
                },
              }}
            >
              <HttpRoundedIcon sx={{ color: 'primary.500', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                level="body-xs"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.tertiary',
                  fontSize: '0.65rem',
                }}
              >
                Status Code
              </Typography>
              <Typography
                level="h4"
                fontWeight={800}
                sx={{
                  color: result.statusCode >= 400 ? 'danger.plainColor' : 'primary.plainColor',
                  fontSize: '1.2rem',
                }}
              >
                {result.statusCode}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            border: '1px solid',
            borderColor: 'neutral.200',
            borderRadius: '10px',
            '--Card-padding': '16px',
            bgcolor: 'background.surface',
            '[data-joy-color-scheme="dark"] &': {
              borderColor: 'neutral.300',
            },
          }}
        >
          <CardContent orientation="horizontal" sx={{ gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(128,128,160,0.1), rgba(128,128,160,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '[data-joy-color-scheme="dark"] &': {
                  background: 'linear-gradient(135deg, rgba(160,170,200,0.15), rgba(160,170,200,0.08))',
                },
              }}
            >
              <SpeedRoundedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                level="body-xs"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.tertiary',
                  fontSize: '0.65rem',
                }}
              >
                Duration
              </Typography>
              <Typography level="h4" fontWeight={800} sx={{ fontSize: '1.2rem' }}>
                {result.durationMs}ms
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {totalCount > 0 && (
          <Card
            variant="outlined"
            sx={{
              border: '1px solid',
              borderColor: passed ? 'success.outlinedBorder' : 'danger.outlinedBorder',
              borderRadius: '10px',
              '--Card-padding': '16px',
              bgcolor: 'background.surface',
            }}
          >
            <CardContent orientation="horizontal" sx={{ gap: 2, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  bgcolor: passed ? 'success.softBg' : 'danger.softBg',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {passed ? (
                  <CheckCircleRoundedIcon sx={{ color: 'success.plainColor', fontSize: 22 }} />
                ) : (
                  <ErrorRoundedIcon sx={{ color: 'danger.plainColor', fontSize: 22 }} />
                )}
              </Box>
              <Box>
                <Typography
                  level="body-xs"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'text.tertiary',
                    fontSize: '0.65rem',
                  }}
                >
                  Assertions
                </Typography>
                <Typography
                  level="h4"
                  fontWeight={800}
                  sx={{
                    color: passed ? 'success.plainColor' : 'danger.plainColor',
                    fontSize: '1.2rem',
                  }}
                >
                  {passedCount}/{totalCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {result.error && (
        <Alert
          color="danger"
          variant="soft"
          sx={{
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'danger.outlinedBorder',
          }}
        >
          {result.error}
        </Alert>
      )}

      {/* Accordion sections */}
      <AccordionGroup
        variant="outlined"
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'neutral.200',
          '--AccordionSummary-minHeight': '48px',
          '[data-joy-color-scheme="dark"] &': {
            borderColor: 'neutral.300',
          },
        }}
      >
        {result.request && (result.request.url || result.request.body) && (
          <Accordion defaultExpanded>
            <AccordionSummary indicator={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '[data-joy-color-scheme="dark"] &': {
                      background: 'linear-gradient(135deg, rgba(76,110,245,0.2), rgba(76,110,245,0.1))',
                    },
                  }}
                >
                  <CodeRoundedIcon sx={{ fontSize: 16, color: 'primary.plainColor' }} />
                </Box>
                <Typography fontWeight={700} level="title-sm" sx={{ fontSize: '0.8rem' }}>
                  Request
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip size="sm" variant="soft" color="primary" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {result.request.method}
                  </Chip>
                  <Typography
                    level="body-sm"
                    component="code"
                    sx={{
                      wordBreak: 'break-all',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                    }}
                  >
                    {result.request.url}
                  </Typography>
                </Box>
                {result.request.headers && Object.keys(result.request.headers).length > 0 && (
                  <Box>
                    <Typography
                      level="body-xs"
                      sx={{
                        mb: 0.5,
                        fontWeight: 700,
                        color: 'text.tertiary',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Headers
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.78rem',
                        p: 2,
                        bgcolor: 'background.level2',
                        borderRadius: '8px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        fontFamily: 'monospace',
                        color: 'text.primary',
                        '[data-joy-color-scheme="dark"] &': {
                          borderColor: 'neutral.300',
                        },
                      }}
                    >
                      {JSON.stringify(result.request.headers, null, 2)}
                    </Box>
                  </Box>
                )}
                {result.request.body && (
                  <Box>
                    <Typography
                      level="body-xs"
                      sx={{
                        mb: 0.5,
                        fontWeight: 700,
                        color: 'text.tertiary',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Body
                    </Typography>
                    <JsonEditor value={tryFormatJson(result.request.body)} readOnly minHeight={140} />
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {result.assertionResults.length > 0 && (
          <Accordion defaultExpanded>
            <AccordionSummary indicator={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    bgcolor: passed ? 'success.softBg' : 'danger.softBg',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 16, color: passed ? 'success.plainColor' : 'danger.plainColor' }} />
                </Box>
                <Typography fontWeight={700} level="title-sm" sx={{ fontSize: '0.8rem' }}>
                  Rule Results
                </Typography>
                <Chip size="sm" variant="soft" color={passed ? 'success' : 'danger'} sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                  {passedCount}/{totalCount}
                </Chip>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Sheet
                variant="outlined"
                sx={{
                  borderRadius: '8px',
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'neutral.200',
                  '[data-joy-color-scheme="dark"] &': {
                    borderColor: 'neutral.300',
                  },
                }}
              >
                <Table
                  size="sm"
                  stickyHeader
                  sx={{
                    ...tableStyles,
                    tableLayout: 'fixed',
                    width: '100%',
                    minWidth: 400,
                    '& td': {
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      verticalAlign: 'top',
                    },
                    '& th:first-of-type': { width: 90 },
                    '& th:nth-of-type(2)': { width: '22%' },
                    '& th:nth-of-type(3)': { width: '26%' },
                    '& th:nth-of-type(4)': { width: '26%' },
                    '& th:last-of-type': { width: 72 },
                  }}
                >
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Key/Path</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.assertionResults.map((ar: AssertionResult, i: number) => (
                      <tr
                        key={i}
                        style={{
                          backgroundColor: ar.passed ? undefined : 'var(--joy-palette-danger-softBg)',
                        }}
                      >
                        <td>
                          <Chip size="sm" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            {ar.type}
                          </Chip>
                        </td>
                        <td>
                          <Typography level="body-sm" fontFamily="monospace" fontWeight={500} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '0.78rem' }}>
                            {ar.key || '-'}
                          </Typography>
                        </td>
                        <td>
                          <Typography level="body-sm" fontWeight={500} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '0.78rem' }}>
                            {ar.expected}
                          </Typography>
                        </td>
                        <td>
                          <Typography
                            level="body-sm"
                            fontWeight={500}
                            sx={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              fontSize: '0.78rem',
                              color: ar.passed ? 'text.primary' : 'danger.plainColor',
                            }}
                          >
                            {ar.actual}
                          </Typography>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {ar.passed ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'success.500' }} />
                          ) : (
                            <ErrorRoundedIcon sx={{ fontSize: 20, color: 'danger.500' }} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Sheet>
            </AccordionDetails>
          </Accordion>
        )}

        {result.responseBody && (
          <Accordion defaultExpanded>
            <AccordionSummary indicator={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    bgcolor: 'background.level2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CodeRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </Box>
                <Typography fontWeight={700} level="title-sm" sx={{ fontSize: '0.8rem' }}>
                  Response
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <JsonEditor value={tryFormatJson(result.responseBody)} readOnly minHeight={320} />
            </AccordionDetails>
          </Accordion>
        )}
      </AccordionGroup>
    </Box>
  );
}
