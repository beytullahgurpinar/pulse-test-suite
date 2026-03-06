import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Sheet,
    Chip,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    accordionSummaryClasses,
    Button,
} from '@mui/joy';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import type { FlowRun } from '../types';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { RunResults } from '../components/RunResults';

export function FlowRunResultPage() {
    const { runId } = useParams();
    const navigate = useNavigate();
    const rid = runId ? parseInt(runId, 10) : null;

    const [run, setRun] = useState<FlowRun | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (rid) {
            setLoading(true);
            api.getFlowRun(rid)
                .then(setRun)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
        }
    }, [rid]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress size="lg" />
            </Box>
        );
    }

    if (error || !run) {
        return (
            <Box p={3}>
                <Sheet variant="soft" color="danger" sx={{ p: 3, borderRadius: 'md' }}>
                    <Typography>{error || 'Flow run not found'}</Typography>
                </Sheet>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title={`Flow Run Details`}
                subtitle={`#${run.id}`}
                icon={<HistoryRoundedIcon sx={{ fontSize: 22 }} />}
                actions={
                    <Button
                        variant="outlined"
                        color="neutral"
                        startDecorator={<ArrowBackRoundedIcon />}
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </Button>
                }
            />

            <Stack spacing={3} sx={{ pb: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: '12px', boxShadow: 'sm' }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={3}>
                                <Box>
                                    <Typography level="body-xs" fontWeight={700} textColor="neutral.500" sx={{ mb: 0.5, textTransform: 'uppercase' }}>
                                        Status
                                    </Typography>
                                    <Chip
                                        variant="soft"
                                        color={run.status === 'passed' ? 'success' : run.status === 'running' ? 'warning' : 'danger'}
                                        size="md"
                                        startDecorator={run.status === 'passed' ? <CheckCircleRoundedIcon /> : <ErrorRoundedIcon />}
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {run.status.toUpperCase()}
                                    </Chip>
                                </Box>
                                <Box>
                                    <Typography level="body-xs" fontWeight={700} textColor="neutral.500" sx={{ mb: 0.5, textTransform: 'uppercase' }}>
                                        Duration
                                    </Typography>
                                    <Typography level="title-md" fontWeight={600}>
                                        {run.durationMs} ms
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography level="body-xs" fontWeight={700} textColor="neutral.500" sx={{ mb: 0.5, textTransform: 'uppercase' }}>
                                        Date
                                    </Typography>
                                    <Typography level="title-md" fontWeight={600}>
                                        {new Date(run.createdAt).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </CardContent>
                </Card>

                <Typography level="h4" fontWeight={700}>
                    Steps Configuration & Results
                </Typography>

                <Box>
                    {(run.steps || []).map((step, idx) => (
                        <Accordion
                            key={step.id}
                            variant="outlined"
                            sx={{
                                borderRadius: '12px',
                                mb: 2,
                                bgcolor: 'background.surface',
                                '&:first-of-type': { borderTopLeftRadius: '12px', borderTopRightRadius: '12px' },
                                '&:last-of-type': { borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
                                overflow: 'hidden',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    borderColor: 'primary.300',
                                    boxShadow: 'md',
                                }
                            }}
                        >
                            <AccordionSummary
                                indicator={<ExpandMoreRoundedIcon />}
                                sx={{
                                    [`& .${accordionSummaryClasses.button}`]: {
                                        p: 2,
                                    },
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: step.status === 'passed' ? 'success.softBg' : 'danger.softBg',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: step.status === 'passed' ? 'success.500' : 'danger.500',
                                            fontWeight: 800,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {idx + 1}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography level="title-md" fontWeight={700}>
                                            Step {idx + 1}: {step.testRun?.requestMethod || 'Test'} Result
                                        </Typography>
                                        <Typography level="body-xs" textColor="neutral.500">
                                            {step.testRun?.requestUrl || 'Unknown URL'}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        size="sm"
                                        variant="soft"
                                        color={step.status === 'passed' ? 'success' : 'danger'}
                                        sx={{ mr: 2, fontWeight: 700 }}
                                    >
                                        {step.status}
                                    </Chip>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ p: 2, bgcolor: 'background.level1' }}>
                                    {step.extractedData && (
                                        <Sheet
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 'md',
                                                mb: 2,
                                                bgcolor: 'background.surface',
                                                borderLeft: '4px solid',
                                                borderLeftColor: 'primary.400'
                                            }}
                                        >
                                            <Typography level="title-sm" fontWeight={700} mb={1}>
                                                Extracted Data from Step
                                            </Typography>
                                            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                {JSON.stringify(JSON.parse(step.extractedData), null, 2)}
                                            </pre>
                                        </Sheet>
                                    )}

                                    {step.testRun ? (
                                        <Box sx={{ bgcolor: 'background.surface', borderRadius: 'md', border: '1px solid', borderColor: 'neutral.200' }}>
                                            <RunResults
                                                result={{
                                                    passed: step.status === 'passed',
                                                    statusCode: step.testRun.statusCode,
                                                    responseBody: step.testRun.responseBody,
                                                    durationMs: step.testRun.durationMs,
                                                    assertionResults: JSON.parse(step.testRun.assertionResults || '[]'),
                                                    error: step.testRun.errorMessage,
                                                    request: {
                                                        method: step.testRun.requestMethod || 'GET',
                                                        url: step.testRun.requestUrl || '',
                                                        headers: JSON.parse(step.testRun.requestHeaders || '{}'),
                                                        body: step.testRun.requestBody,
                                                    }
                                                }}
                                                testName={`Step ${idx + 1}`}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography color="neutral" sx={{ p: 2 }}>Test run details not available</Typography>
                                    )}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            </Stack>
        </Box>
    );
}
