import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Sheet,
    Chip,
    IconButton,
    Switch,
    Modal,
    ModalDialog,
    ModalClose,
    FormControl,
    FormLabel,
    Input,
    Select,
    Option,
    Checkbox,
    CircularProgress,
    Tooltip,
    Divider,
    RadioGroup,
    Radio,
    Stack,
} from '@mui/joy';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import type { Schedule, Project, TestRequest, Flow, Environment } from '../types';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';

const INTERVAL_OPTIONS = [
    { value: 5, label: 'Every 5 minutes' },
    { value: 15, label: 'Every 15 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' },
    { value: 360, label: 'Every 6 hours' },
    { value: 720, label: 'Every 12 hours' },
    { value: 1440, label: 'Every 24 hours' },
];

function formatInterval(mins: number) {
    if (mins < 60) return `${mins}min`;
    if (mins < 1440) return `${mins / 60}h`;
    return `${mins / 1440}d`;
}

function formatDateTime(s: string | undefined) {
    if (!s) return '—';
    try {
        return new Date(s).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    } catch { return s; }
}

interface ScheduleFormData {
    name: string;
    projectId: number;
    intervalMins: number;
    runAllTests: boolean;
    testRequestId?: number;
    flowId?: number;
    environmentId?: number;
    webhookUrl: string;
    notifyOnFail: boolean;
    notifyOnSuccess: boolean;
}

const defaultFormData: ScheduleFormData = {
    name: '',
    projectId: 0,
    intervalMins: 60,
    runAllTests: true,
    webhookUrl: '',
    notifyOnFail: true,
    notifyOnSuccess: false,
};

import { useParams } from 'react-router-dom';

export function SchedulesPage() {
    const { projectId } = useParams();
    const pid = projectId ? parseInt(projectId, 10) : null;

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tests, setTests] = useState<TestRequest[]>([]);
    const [flows, setFlows] = useState<Flow[]>([]);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [allEnvironments, setAllEnvironments] = useState<Environment[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<ScheduleFormData>(defaultFormData);
    const [saving, setSaving] = useState(false);
    const [runType, setRunType] = useState<'all' | 'test' | 'flow'>('all');

    const loadData = useCallback(async () => {
        try {
            const [s, p] = await Promise.all([
                api.listSchedules(pid || undefined),
                api.listProjects()
            ]);
            setSchedules(s);
            setProjects(p);

            const projIds = Array.from(new Set(s.map(sch => sch.projectId)));
            const envsArrays = await Promise.all(
                projIds.map(id => api.listEnvironments(id).catch(() => []))
            );
            setAllEnvironments(envsArrays.flat());
        } catch { /* ignore */ }
        setLoading(false);
    }, [pid]);

    useEffect(() => { loadData(); }, [loadData]);

    const loadProjectResources = async (projectId: number) => {
        if (projectId > 0) {
            const [t, f, e] = await Promise.all([
                api.listTests(projectId),
                api.listFlows(projectId),
                api.listEnvironments(projectId),
            ]);
            setTests(t);
            setFlows(f);
            setEnvironments(e ?? []);
        } else {
            setTests([]);
            setFlows([]);
            setEnvironments([]);
        }
    };

    const openCreateModal = () => {
        setEditId(null);
        const defaultProject = pid || (projects.length > 0 ? projects[0].id : 0);
        setForm({ ...defaultFormData, projectId: defaultProject });
        setRunType('all');
        if (defaultProject) loadProjectResources(defaultProject);
        setModalOpen(true);
    };

    const openEditModal = async (s: Schedule) => {
        setEditId(s.id!);
        let rType: 'all' | 'test' | 'flow' = 'all';
        if (!s.runAllTests) {
            if (s.flowId) rType = 'flow';
            else if (s.testRequestId) rType = 'test';
        }
        setRunType(rType);
        setForm({
            name: s.name,
            projectId: s.projectId,
            intervalMins: s.intervalMins,
            runAllTests: s.runAllTests,
            testRequestId: s.testRequestId,
            flowId: s.flowId,
            environmentId: s.environmentId,
            webhookUrl: s.webhookUrl,
            notifyOnFail: s.notifyOnFail,
            notifyOnSuccess: s.notifyOnSuccess,
        });
        await loadProjectResources(s.projectId);
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.projectId) return;
        setSaving(true);
        const submitData = { ...form };
        submitData.runAllTests = runType === 'all';
        if (runType === 'all') {
            submitData.testRequestId = undefined;
            submitData.flowId = undefined;
        } else if (runType === 'test') {
            submitData.flowId = undefined;
        } else if (runType === 'flow') {
            submitData.testRequestId = undefined;
        }

        try {
            if (editId) {
                await api.updateSchedule(editId, { ...submitData, enabled: true });
            } else {
                await api.createSchedule({ ...submitData, enabled: true });
            }
            setModalOpen(false);
            await loadData();
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: number) => {
        await api.toggleSchedule(id);
        await loadData();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this schedule?')) return;
        await api.deleteSchedule(id);
        await loadData();
    };

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title="Schedules"
                subtitle={`${schedules.filter(s => s.enabled).length} active`}
                description="Automated test execution with webhook notifications"
                icon={<ScheduleRoundedIcon sx={{ fontSize: 22 }} />}
                actions={
                    <Button
                        startDecorator={<AddRoundedIcon />}
                        onClick={openCreateModal}
                        sx={{
                            fontWeight: 600,
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #4263eb 0%, #4c6ef5 100%)' },
                        }}
                    >
                        New Schedule
                    </Button>
                }
            />

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress size="lg" />
                </Box>
            ) : schedules.length === 0 ? (
                <Sheet
                    variant="outlined"
                    sx={{
                        p: 8,
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: '2px dashed',
                        borderColor: 'neutral.200',
                        bgcolor: 'background.level1',
                    }}
                >
                    <Box
                        sx={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 2,
                        }}
                    >
                        <ScheduleRoundedIcon sx={{ fontSize: 36, color: 'primary.500' }} />
                    </Box>
                    <Typography level="h4" fontWeight={700} sx={{ mb: 1 }}>No schedules yet</Typography>
                    <Typography level="body-md" sx={{ color: 'text.secondary', mb: 3 }}>
                        Create a schedule to automatically run your tests at regular intervals
                    </Typography>
                    <Button
                        startDecorator={<AddRoundedIcon />}
                        onClick={openCreateModal}
                        sx={{
                            fontWeight: 600, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)',
                        }}
                    >
                        Create First Schedule
                    </Button>
                </Sheet>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {schedules.map((s) => {
                        const project = projects.find(p => p.id === s.projectId);
                        return (
                            <Card
                                key={s.id}
                                variant="outlined"
                                sx={{
                                    borderRadius: '14px',
                                    border: '1px solid',
                                    borderColor: s.enabled ? 'primary.outlinedBorder' : 'neutral.200',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                    opacity: s.enabled ? 1 : 0.7,
                                }}
                            >
                                {s.enabled && (
                                    <Box sx={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                        background: 'linear-gradient(90deg, #4c6ef5, #5c7cfa)',
                                    }} />
                                )}
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                                <Typography level="title-lg" fontWeight={700} sx={{ fontSize: '1rem' }}>
                                                    {s.name}
                                                </Typography>
                                                <Chip size="sm" variant="soft" color={s.enabled ? 'success' : 'neutral'} sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                                                    {s.enabled ? 'Active' : 'Paused'}
                                                </Chip>
                                                {s.notifyOnFail && s.webhookUrl && (
                                                    <Tooltip title="Webhook notifications enabled" size="sm">
                                                        <NotificationsRoundedIcon sx={{ fontSize: 16, color: 'warning.plainColor' }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, alignItems: 'center' }}>
                                                <Chip size="sm" variant="outlined" startDecorator={<ScheduleRoundedIcon sx={{ fontSize: 14 }} />}
                                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                                    {formatInterval(s.intervalMins)}
                                                </Chip>
                                                {project && (
                                                    <Chip size="sm" variant="soft" color="neutral" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                                        {project.name}
                                                    </Chip>
                                                )}
                                                <Chip
                                                    size="sm"
                                                    variant="soft"
                                                    color={s.runAllTests ? "primary" : s.flowId ? "success" : "warning"}
                                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                                    startDecorator={s.runAllTests ? <ScienceRoundedIcon sx={{ fontSize: 14 }} /> : s.flowId ? <AccountTreeRoundedIcon sx={{ fontSize: 14 }} /> : <ScienceRoundedIcon sx={{ fontSize: 14 }} />}
                                                >
                                                    {s.runAllTests ? 'All Tests' : s.flowId ? 'Flow Execution' : 'Single Test'}
                                                </Chip>
                                                {s.environmentId && (
                                                    <Chip size="sm" variant="outlined" startDecorator={<PublicRoundedIcon sx={{ fontSize: 14 }} />}
                                                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                                        {allEnvironments.find(e => e.id === s.environmentId)?.name || `Env #${s.environmentId}`}
                                                    </Chip>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
                                                    Last run: {formatDateTime(s.lastRunAt)}
                                                </Typography>
                                                <Typography level="body-xs" sx={{ color: 'text.tertiary', fontSize: '0.65rem' }}>
                                                    Next run: {formatDateTime(s.nextRunAt)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                            <Switch
                                                checked={s.enabled}
                                                onChange={() => handleToggle(s.id!)}
                                                sx={{ '--Switch-trackWidth': '40px', '--Switch-trackHeight': '22px' }}
                                            />
                                            <Tooltip title="Edit" size="sm">
                                                <IconButton size="sm" variant="plain" onClick={() => openEditModal(s)} sx={{ '--IconButton-size': '32px' }}>
                                                    <EditRoundedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete" size="sm">
                                                <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(s.id!)} sx={{ '--IconButton-size': '32px' }}>
                                                    <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            )}

            {/* Create/Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <ModalDialog sx={{ width: 520, maxWidth: '95vw', borderRadius: '16px', p: 3 }}>
                    <ModalClose />
                    <Typography level="h4" fontWeight={700} sx={{ mb: 2 }}>
                        {editId ? 'Edit Schedule' : 'New Schedule'}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControl required>
                            <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Name</FormLabel>
                            <Input
                                placeholder="e.g. Production Health Check"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                sx={{ borderRadius: '8px' }}
                            />
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {!pid && (
                                <FormControl required sx={{ flex: 1 }}>
                                    <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Project</FormLabel>
                                    <Select
                                        value={form.projectId}
                                        onChange={(_, v) => {
                                            const projId = v as number;
                                            setForm(f => ({ ...f, projectId: projId }));
                                            loadProjectResources(projId);
                                        }}
                                        sx={{ borderRadius: '8px' }}
                                    >
                                        {projects.map(p => (
                                            <Option key={p.id} value={p.id}>{p.name}</Option>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            <FormControl required sx={{ flex: (pid ? 0 : 1), minWidth: (pid ? '220px' : 'auto') }}>
                                <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Interval</FormLabel>
                                <Select
                                    value={form.intervalMins}
                                    onChange={(_, v) => setForm(f => ({ ...f, intervalMins: v as number }))}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    {INTERVAL_OPTIONS.map(o => (
                                        <Option key={o.value} value={o.value}>{o.label}</Option>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <FormControl>
                            <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Execution Mode</FormLabel>
                            <RadioGroup
                                value={runType}
                                onChange={(e) => setRunType(e.target.value as any)}
                                sx={{ px: 1 }}
                            >
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Radio value="all" label="All Tests" sx={{ fontSize: '0.85rem' }} />
                                    <Radio value="test" label="Single Test" sx={{ fontSize: '0.85rem' }} />
                                    <Radio value="flow" label="Flow Scenario" sx={{ fontSize: '0.85rem' }} />
                                </Box>
                            </RadioGroup>
                        </FormControl>

                        {environments.length > 0 && (
                            <FormControl>
                                <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Environment (optional)</FormLabel>
                                <Select
                                    value={form.environmentId || 0}
                                    onChange={(_, v) => setForm(f => ({ ...f, environmentId: (v as number) || undefined }))}
                                    sx={{ borderRadius: '8px' }}
                                    placeholder="Use project default"
                                >
                                    <Option value={0}>Project Default</Option>
                                    {environments.map(e => (
                                        <Option key={e.id} value={e.id}>
                                            {e.name}{e.isDefault ? ' (default)' : ''}
                                        </Option>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {runType === 'test' && (
                            <FormControl required>
                                <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Select Test</FormLabel>
                                <Select
                                    value={form.testRequestId || 0}
                                    onChange={(_, v) => setForm(f => ({ ...f, testRequestId: v as number }))}
                                    sx={{ borderRadius: '8px' }}
                                    placeholder="Select a test..."
                                >
                                    {tests.map(t => (
                                        <Option key={t.id} value={t.id!}>{t.name}</Option>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {runType === 'flow' && (
                            <FormControl required>
                                <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Select Flow</FormLabel>
                                <Select
                                    value={form.flowId || 0}
                                    onChange={(_, v) => setForm(f => ({ ...f, flowId: v as number }))}
                                    sx={{ borderRadius: '8px' }}
                                    placeholder="Select a flow..."
                                >
                                    {flows.map(f => (
                                        <Option key={f.id} value={f.id!}>{f.name}</Option>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Divider sx={{ my: 0.5 }} />

                        <Box>
                            <Typography level="title-sm" fontWeight={700} startDecorator={<NotificationsRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: '0.85rem', mb: 1.5 }}>
                                Webhook Notifications
                            </Typography>
                            <FormControl>
                                <FormLabel sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Webhook URL (Optional)</FormLabel>
                                <Input
                                    placeholder="https://hooks.slack.com/..."
                                    value={form.webhookUrl}
                                    onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                                    sx={{ borderRadius: '8px' }}
                                />
                            </FormControl>
                            <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                                <Checkbox
                                    label="Notify on failure"
                                    checked={form.notifyOnFail}
                                    onChange={e => setForm(f => ({ ...f, notifyOnFail: e.target.checked }))}
                                    disabled={!form.webhookUrl}
                                    sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                                />
                                <Checkbox
                                    label="Notify on success"
                                    checked={form.notifyOnSuccess}
                                    onChange={e => setForm(f => ({ ...f, notifyOnSuccess: e.target.checked }))}
                                    disabled={!form.webhookUrl}
                                    sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                                />
                            </Stack>
                        </Box>

                        <Button
                            onClick={handleSave}
                            loading={saving}
                            sx={{
                                mt: 1, fontWeight: 700, borderRadius: '10px',
                                background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #4263eb 0%, #4c6ef5 100%)' },
                            }}
                        >
                            {editId ? 'Update Schedule' : 'Create Schedule'}
                        </Button>
                    </Box>
                </ModalDialog>
            </Modal>
        </Box>
    );
}

