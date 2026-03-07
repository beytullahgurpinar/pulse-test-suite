import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Card,
} from '@mui/joy';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import type { Flow } from '../types';
import { api } from '../api';
import { FlowList } from '../components/FlowList';
import { PageHeader } from '../components/PageHeader';
import { EnvironmentSelect } from '../components/EnvironmentSelect';
import { useEnvironments } from '../hooks/useEnvironments';

export function FlowsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const pid = projectId ? parseInt(projectId, 10) : null;

    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningFlowId, setRunningFlowId] = useState<number | null>(null);
    const { environments, selectedEnvId, setSelectedEnvId } = useEnvironments(pid);

    const loadData = async (id: number) => {
        setLoading(true);
        try {
            const fRes = await api.listFlows(id);
            setFlows(fRes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pid) {
            loadData(pid);
        }
    }, [pid]);

    const handleRunFlow = async (id: number) => {
        setRunningFlowId(id);
        try {
            const run = await api.runFlow(id, selectedEnvId);
            navigate(`/flows/runs/${run.id}`);
        } catch (err) {
            console.error('Failed to run flow', err);
        } finally {
            setRunningFlowId(null);
        }
    };

    if (!pid) return <Box p={3}><Typography>Select a project</Typography></Box>;

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title="Flows"
                description="Sequential test execution sequences"
                icon={<AccountTreeRoundedIcon sx={{ fontSize: 22 }} />}
                actions={
                    <>
                    <EnvironmentSelect
                        environments={environments}
                        value={selectedEnvId}
                        onChange={setSelectedEnvId}
                    />
                    <Button
                        size="sm"
                        startDecorator={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                        onClick={() => navigate(`/p/${pid}/flows/new`)}
                        sx={{
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 2,
                            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            }
                        }}
                    >
                        New Flow
                    </Button>
                    </>
                }
            />

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress size="lg" />
                </Box>
            ) : (
                <Card variant="outlined" sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px', p: 0 }}>
                    <FlowList
                        flows={flows}
                        onRefresh={() => loadData(pid)}
                        onEdit={(id) => navigate(`/p/${pid}/flows/${id}/edit`)}
                        onRun={handleRunFlow}
                        onHistory={(id) => navigate(`/p/${pid}/flows/${id}/history`)}
                        runningFlowId={runningFlowId}
                    />
                </Card>
            )}
        </Box>
    );
}
