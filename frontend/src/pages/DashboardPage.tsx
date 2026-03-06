import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Sheet,
    Table,
    Chip,
    CircularProgress,
    LinearProgress,
} from '@mui/joy';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import type { DashboardData } from '../types';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { tableStyles } from '../components/DataTable';

function formatDateTime(s: string) {
    try {
        const d = new Date(s);
        return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return s;
    }
}

function formatDuration(ms: number) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

export function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDashboard()
            .then(setData)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={12}>
                <CircularProgress size="lg" />
            </Box>
        );
    }

    if (!data) {
        return (
            <Box>
                <PageHeader
                    title="Dashboard"
                    description="Overview of your API test suite"
                    icon={<DashboardRoundedIcon sx={{ fontSize: 22 }} />}
                />
                <Sheet variant="soft" color="danger" sx={{ p: 4, borderRadius: '12px' }}>
                    <Typography>Failed to load dashboard data</Typography>
                </Sheet>
            </Box>
        );
    }

    const successRate = data.successRate;

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="Real-time overview of your API test suite health"
                icon={<DashboardRoundedIcon sx={{ fontSize: 22 }} />}
            />

            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                {/* Success Rate */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        position: 'relative',
                        overflow: 'hidden',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: successRate >= 80
                                ? 'linear-gradient(90deg, #059669, #34d399)'
                                : successRate >= 50
                                    ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                                    : 'linear-gradient(90deg, #dc2626, #f87171)',
                        }}
                    />
                    <CardContent sx={{ pt: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography level="body-xs" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.tertiary', fontSize: '0.65rem' }}>
                                Success Rate
                            </Typography>
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '10px',
                                bgcolor: successRate >= 80 ? 'success.softBg' : successRate >= 50 ? 'warning.softBg' : 'danger.softBg',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TrendingUpRoundedIcon sx={{ fontSize: 20, color: successRate >= 80 ? 'success.plainColor' : successRate >= 50 ? 'warning.plainColor' : 'danger.plainColor' }} />
                            </Box>
                        </Box>
                        <Typography level="h2" fontWeight={800} sx={{ fontSize: '2rem', lineHeight: 1 }}>
                            {successRate.toFixed(1)}%
                        </Typography>
                        <LinearProgress
                            determinate
                            value={successRate}
                            color={successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'danger'}
                            sx={{ mt: 1.5, height: 6, borderRadius: '3px' }}
                        />
                    </CardContent>
                </Card>

                {/* Total Tests */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography level="body-xs" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.tertiary', fontSize: '0.65rem' }}>
                                Total Tests
                            </Typography>
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                '[data-joy-color-scheme="dark"] &': { background: 'linear-gradient(135deg, rgba(76,110,245,0.2), rgba(76,110,245,0.1))' },
                            }}>
                                <ScienceRoundedIcon sx={{ fontSize: 20, color: 'primary.plainColor' }} />
                            </Box>
                        </Box>
                        <Typography level="h2" fontWeight={800} sx={{ fontSize: '2rem', lineHeight: 1 }}>
                            {data.totalTests}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.5 }}>
                            across {data.projectStats.length} project{data.projectStats.length !== 1 ? 's' : ''}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Total Runs */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography level="body-xs" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.tertiary', fontSize: '0.65rem' }}>
                                Total Runs
                            </Typography>
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(128,128,160,0.1), rgba(128,128,160,0.05))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                '[data-joy-color-scheme="dark"] &': { background: 'linear-gradient(135deg, rgba(160,170,200,0.15), rgba(160,170,200,0.08))' },
                            }}>
                                <PlayArrowRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </Box>
                        </Box>
                        <Typography level="h2" fontWeight={800} sx={{ fontSize: '2rem', lineHeight: 1 }}>
                            {data.totalRuns}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                            <Chip size="sm" variant="soft" color="success" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                                {data.passedRuns} passed
                            </Chip>
                            <Chip size="sm" variant="soft" color="danger" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                                {data.failedRuns} failed
                            </Chip>
                        </Box>
                    </CardContent>
                </Card>

                {/* Avg Duration */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography level="body-xs" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.tertiary', fontSize: '0.65rem' }}>
                                Avg Duration
                            </Typography>
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(217,119,6,0.1), rgba(217,119,6,0.05))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                '[data-joy-color-scheme="dark"] &': { background: 'linear-gradient(135deg, rgba(217,119,6,0.2), rgba(217,119,6,0.1))' },
                            }}>
                                <SpeedRoundedIcon sx={{ fontSize: 20, color: 'warning.plainColor' }} />
                            </Box>
                        </Box>
                        <Typography level="h2" fontWeight={800} sx={{ fontSize: '2rem', lineHeight: 1 }}>
                            {formatDuration(data.avgDuration)}
                        </Typography>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.5 }}>
                            {data.activeSchedules} active schedule{data.activeSchedules !== 1 ? 's' : ''}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Two Column Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
                {/* Recent Runs */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        overflow: 'hidden',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'neutral.200', '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 32, height: 32, borderRadius: '8px',
                                    background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    '[data-joy-color-scheme="dark"] &': { background: 'linear-gradient(135deg, rgba(76,110,245,0.2), rgba(76,110,245,0.1))' },
                                }}>
                                    <ScheduleRoundedIcon sx={{ fontSize: 16, color: 'primary.plainColor' }} />
                                </Box>
                                <Typography level="title-md" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                                    Recent Runs
                                </Typography>
                            </Box>
                        </Box>
                        {data.recentRuns.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>No runs yet</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ overflow: 'auto', maxHeight: 420 }}>
                                <Table size="sm" sx={{ ...tableStyles, '& thead th': { ...tableStyles['& thead th'], position: 'sticky', top: 0, zIndex: 1 } }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}></th>
                                            <th>Test</th>
                                            <th style={{ width: 80 }}>Code</th>
                                            <th style={{ width: 80 }}>Time</th>
                                            <th style={{ width: 110 }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recentRuns.map((run) => (
                                            <tr key={run.id}>
                                                <td>
                                                    {run.status === 'passed' ? (
                                                        <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'success.500' }} />
                                                    ) : (
                                                        <ErrorRoundedIcon sx={{ fontSize: 18, color: 'danger.500' }} />
                                                    )}
                                                </td>
                                                <td>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Typography level="body-sm" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                                                            {run.testName || `Test #${run.id}`}
                                                        </Typography>
                                                        {run.scheduleId && (
                                                            <Chip size="sm" variant="soft" color="primary" sx={{ fontSize: '0.6rem', height: 18, '--Chip-paddingInline': '4px' }}>
                                                                auto
                                                            </Chip>
                                                        )}
                                                    </Box>
                                                </td>
                                                <td>
                                                    <Typography level="body-sm" fontFamily="monospace" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
                                                        {run.statusCode}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography level="body-sm" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                                        {formatDuration(run.durationMs)}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography level="body-sm" sx={{ color: 'text.tertiary', fontSize: '0.7rem' }}>
                                                        {formatDateTime(run.createdAt)}
                                                    </Typography>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Project Health */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: '14px',
                        border: '1px solid',
                        borderColor: 'neutral.200',
                        overflow: 'hidden',
                        '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                    }}
                >
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'neutral.200', '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 32, height: 32, borderRadius: '8px',
                                    bgcolor: 'success.softBg',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FolderRoundedIcon sx={{ fontSize: 16, color: 'success.plainColor' }} />
                                </Box>
                                <Typography level="title-md" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                                    Project Health
                                </Typography>
                            </Box>
                        </Box>
                        {data.projectStats.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>No projects yet</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {data.projectStats.map((ps) => {
                                    const rate = ps.runCount > 0 ? (ps.passCount / ps.runCount) * 100 : 0;
                                    return (
                                        <Sheet
                                            key={ps.projectId}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: '10px',
                                                border: '1px solid',
                                                borderColor: 'neutral.200',
                                                '[data-joy-color-scheme="dark"] &': { borderColor: 'neutral.300' },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography level="title-sm" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                                    {ps.projectName}
                                                </Typography>
                                                <Chip
                                                    size="sm"
                                                    variant="soft"
                                                    color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}
                                                    sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                                >
                                                    {rate.toFixed(0)}%
                                                </Chip>
                                            </Box>
                                            <LinearProgress
                                                determinate
                                                value={rate}
                                                color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}
                                                sx={{ mb: 1, height: 5, borderRadius: '3px' }}
                                            />
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
                                                    {ps.testCount} test{ps.testCount !== 1 ? 's' : ''}
                                                </Typography>
                                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
                                                    {ps.runCount} run{ps.runCount !== 1 ? 's' : ''}
                                                </Typography>
                                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
                                                    avg {formatDuration(ps.avgDuration)}
                                                </Typography>
                                            </Box>
                                        </Sheet>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </>
    );
}
