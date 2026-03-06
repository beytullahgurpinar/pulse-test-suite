import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Table,
    Button,
    CircularProgress,
    Chip,
} from '@mui/joy';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import type { FlowRun, Flow } from '../types';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { tableStyles, DataTableWrapper, DataTablePagination } from '../components/DataTable';

export function FlowHistoryPage() {
    const { id, projectId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const flowId = id ? parseInt(id, 10) : null;
    const pid = projectId ? parseInt(projectId, 10) : null;

    const [flow, setFlow] = useState<Flow | null>(null);
    const [runs, setRuns] = useState<FlowRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
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

    const loadFlow = async () => {
        if (!flowId) return;
        try {
            const f = await api.getFlow(flowId);
            setFlow(f);
        } catch (err) {
            console.error('Failed to load flow:', err);
        }
    };

    const loadRuns = async () => {
        if (!flowId) return;
        setLoading(true);
        try {
            const rs = await api.listFlowRuns(flowId, page + 1, pageSize);
            setRuns(rs.data);
            setTotalItems(rs.total);
        } catch (err) {
            console.error('Failed to load flow runs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFlow();
    }, [flowId]);

    useEffect(() => {
        loadRuns();
    }, [flowId, page, pageSize]);

    const handleRun = async () => {
        if (!flowId) return;
        setRunning(true);
        try {
            await api.runFlow(flowId);
            handlePageChange(0);
            await loadRuns();
        } catch (err) {
            console.error(err);
            alert('Failed to run flow');
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress size="lg" />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title={flow ? `History: ${flow.name}` : 'Flow History'}
                icon={<AccountTreeRoundedIcon sx={{ fontSize: 22 }} />}
                actions={
                    <>
                        <Button
                            variant="outlined"
                            color="neutral"
                            startDecorator={<ArrowBackRoundedIcon />}
                            onClick={() => navigate(pid ? `/p/${pid}/flows` : '/')}
                        >
                            Back
                        </Button>
                        <Button
                            loading={running}
                            startDecorator={<PlayArrowRoundedIcon />}
                            onClick={handleRun}
                            sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                }
                            }}
                        >
                            Run Flow
                        </Button>
                    </>
                }
            />

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
                <Box sx={{ overflowX: 'auto', p: 0 }}>
                    <Table sx={{ ...tableStyles, width: '100%', minWidth: 600, tableLayout: 'auto' }}>
                        <thead>
                            <tr>
                                <th style={{ width: 140 }}>Status</th>
                                <th style={{ width: 120 }}>Duration</th>
                                <th style={{ width: 180 }}>Run Date</th>
                                <th style={{ minWidth: 200 }}>Progress</th>
                                <th style={{ textAlign: 'right', width: 120 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <HistoryRoundedIcon sx={{ fontSize: 48, color: 'text.tertiary' }} />
                                            <Typography color="neutral">No runs found for this flow.</Typography>
                                        </Box>
                                    </td>
                                </tr>
                            ) : (
                                runs.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <Chip
                                                variant="soft"
                                                color={r.status === 'passed' ? 'success' : r.status === 'running' ? 'warning' : 'danger'}
                                                size="sm"
                                                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                                            >
                                                {r.status}
                                            </Chip>
                                        </td>
                                        <td>
                                            <Typography level="body-sm" fontFamily="monospace">
                                                {r.durationMs} ms
                                            </Typography>
                                        </td>
                                        <td>
                                            <Typography level="body-sm">
                                                {new Date(r.createdAt).toLocaleString()}
                                            </Typography>
                                        </td>
                                        <td>
                                            <Typography level="body-xs" color="neutral">
                                                See individual test runs for details
                                            </Typography>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                color="primary"
                                                component={Link}
                                                to={`/flows/runs/${r.id}`}
                                            >
                                                Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Box>
            </DataTableWrapper>
        </Box>
    );
}
