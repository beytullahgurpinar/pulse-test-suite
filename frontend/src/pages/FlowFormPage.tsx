import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    FormControl,
    FormLabel,
    Input,
    IconButton,
    Card,
    CardContent,
    CircularProgress,
    Sheet,
    Autocomplete,
    Chip,
    Divider,
} from '@mui/joy';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import { api } from '../api';
import type { Flow, FlowStep, TestRequest, Category } from '../types';
import { PageHeader } from '../components/PageHeader';

export function FlowFormPage() {
    const { projectId, id } = useParams();
    const navigate = useNavigate();
    const pid = projectId ? parseInt(projectId, 10) : null;
    const flowId = id ? parseInt(id, 10) : null;

    const [loading, setLoading] = useState(!!flowId);

    const getCategoryPath = (catId: number | null | undefined, cats: Category[]): string => {
        if (!catId) return '';
        const cat = cats.find(c => c.id === catId);
        if (!cat) return '';
        if (cat.parentId) {
            const parent = getCategoryPath(cat.parentId, cats);
            return parent ? `${parent} / ${cat.name}` : cat.name;
        }
        return cat.name;
    };
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [steps, setSteps] = useState<(FlowStep & { uid: string })[]>([]);
    const [projectTests, setProjectTests] = useState<TestRequest[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!pid) return;
        Promise.all([api.listTests(pid), api.listCategories(pid)])
            .then(([tests, cats]) => { setProjectTests(tests); setCategories(cats); })
            .catch(console.error);

        if (flowId) {
            api.getFlow(flowId).then((f) => {
                setName(f.name);
                setSteps(f.steps.map(s => ({ ...s, uid: Math.random().toString(36).substr(2, 9) })));
            }).catch((e) => setError(e.message))
                .finally(() => setLoading(false));
        }
    }, [pid, flowId]);

    const addStep = () => {
        setSteps([
            ...steps,
            { uid: Math.random().toString(36).substr(2, 9), testRequestId: 0, orderNum: steps.length, extractions: {} }
        ]);
    };

    const removeStep = (index: number) => {
        const updated = steps.filter((_, i) => i !== index);
        setSteps(updated.map((s, i) => ({ ...s, orderNum: i })));
    };

    const moveStepUp = (index: number) => {
        if (index === 0) return;
        const updated = [...steps];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setSteps(updated.map((s, i) => ({ ...s, orderNum: i })));
    };

    const moveStepDown = (index: number) => {
        if (index === steps.length - 1) return;
        const updated = [...steps];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setSteps(updated.map((s, i) => ({ ...s, orderNum: i })));
    };

    const updateStep = (index: number, field: keyof FlowStep, value: any) => {
        const updated = [...steps];
        updated[index] = { ...updated[index], [field]: value };
        setSteps(updated);
    };

    const addExtraction = (stepIndex: number) => {
        const s = { ...steps[stepIndex] };
        s.extractions = { ...s.extractions, '': '' };
        updateStep(stepIndex, 'extractions', s.extractions);
    };

    const updateExtraction = (stepIndex: number, oldKey: string, newKey: string, newValue: string) => {
        const s = { ...steps[stepIndex] };
        const exts = { ...s.extractions };
        if (oldKey !== newKey) {
            delete exts[oldKey];
        }
        exts[newKey] = newValue;
        updateStep(stepIndex, 'extractions', exts);
    };

    const removeExtraction = (stepIndex: number, key: string) => {
        const s = { ...steps[stepIndex] };
        const exts = { ...s.extractions };
        delete exts[key];
        updateStep(stepIndex, 'extractions', exts);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pid || !name.trim()) return;

        // Validate steps
        if (steps.some(s => s.testRequestId === 0)) {
            setError('Please select a test for all steps');
            return;
        }

        setSaving(true);
        setError('');

        const payload: Partial<Flow> = {
            projectId: pid,
            name: name.trim(),
            steps: steps.map((s, i) => ({
                testRequestId: s.testRequestId,
                orderNum: i,
                extractions: s.extractions
            }))
        };

        try {
            if (flowId) {
                await api.updateFlow(flowId, payload);
            } else {
                await api.createFlow(payload);
            }
            navigate(`/p/${pid}/flows`); // Redirect back to flows
        } catch (err: any) {
            setError(err.message || 'Failed to save flow');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title={flowId ? 'Edit Flow' : 'New Flow'}
                icon={<AccountTreeRoundedIcon />}
                actions={
                    <Button
                        variant="plain"
                        color="neutral"
                        startDecorator={<ArrowBackRoundedIcon />}
                        onClick={() => navigate(`/p/${pid}/flows`)}
                    >
                        Back to Flows
                    </Button>
                }
            />

            <form onSubmit={handleSave}>
                <Card variant="outlined" sx={{ mb: 3, borderRadius: '12px', boxShadow: 'sm' }}>
                    <CardContent>
                        {error && (
                            <Sheet color="danger" variant="soft" sx={{ p: 2, borderRadius: 'md', mb: 2 }}>
                                <Typography color="danger" fontWeight="sm">{error}</Typography>
                            </Sheet>
                        )}

                        <FormControl sx={{ mb: 3 }} required>
                            <FormLabel>Flow Name</FormLabel>
                            <Input
                                placeholder="e.g. User Registration Flow"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormControl>

                        <Typography level="title-md" fontWeight={600} mb={2}>
                            Steps
                        </Typography>

                        {steps.length === 0 ? (
                            <Sheet variant="soft" sx={{ p: 4, borderRadius: 'md', textAlign: 'center', mb: 3 }}>
                                <Typography level="body-md" color="neutral" mb={2}>
                                    No steps added yet. A flow executes multiple tests in sequence.
                                </Typography>
                                <Button variant="outlined" startDecorator={<AddRoundedIcon />} onClick={addStep}>
                                    Add First Step
                                </Button>
                            </Sheet>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                                {steps.map((step, idx) => (
                                    <Sheet
                                        key={step.uid}
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 'md',
                                            borderLeft: '4px solid',
                                            borderLeftColor: 'primary.400',
                                            bgcolor: 'background.surface',
                                        }}
                                    >
                                        <Box display="flex" alignItems="flex-start" gap={2}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1, mr: 1, alignItems: 'center' }}>
                                                <IconButton
                                                    size="sm"
                                                    variant="plain"
                                                    color="neutral"
                                                    disabled={idx === 0}
                                                    onClick={() => moveStepUp(idx)}
                                                    sx={{ '--IconButton-size': '24px' }}
                                                >
                                                    <KeyboardArrowUpRoundedIcon />
                                                </IconButton>
                                                <Box sx={{
                                                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    bgcolor: 'primary.solidBg', color: 'white', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700
                                                }}>
                                                    {idx + 1}
                                                </Box>
                                                <IconButton
                                                    size="sm"
                                                    variant="plain"
                                                    color="neutral"
                                                    disabled={idx === steps.length - 1}
                                                    onClick={() => moveStepDown(idx)}
                                                    sx={{ '--IconButton-size': '24px' }}
                                                >
                                                    <KeyboardArrowDownRoundedIcon />
                                                </IconButton>
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Box display="flex" gap={2} mb={2}>
                                                    <FormControl sx={{ flex: 1 }}>
                                                        <FormLabel>Test to Execute</FormLabel>
                                                        <Autocomplete
                                                            placeholder="Search and select a test..."
                                                            options={[...projectTests].sort((a, b) => {
                                                                const ca = getCategoryPath(a.categoryId, categories);
                                                                const cb = getCategoryPath(b.categoryId, categories);
                                                                return ca.localeCompare(cb) || a.name.localeCompare(b.name);
                                                            })}
                                                            getOptionLabel={(t) => t.name}
                                                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                                            value={projectTests.find(t => t.id === step.testRequestId) ?? null}
                                                            onChange={(_, val) => updateStep(idx, 'testRequestId', val?.id ?? 0)}
                                                            startDecorator={(() => {
                                                                const sel = projectTests.find(t => t.id === step.testRequestId);
                                                                if (!sel) return undefined;
                                                                return (
                                                                    <Chip size="sm" variant="soft"
                                                                        color={({ GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger', PATCH: 'neutral' }[sel.method] as any) || 'neutral'}
                                                                        sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.65rem' }}>
                                                                        {sel.method}
                                                                    </Chip>
                                                                );
                                                            })()}
                                                            slotProps={{ listbox: { sx: { maxHeight: 280, '--List-padding': '4px' } } }}
                                                            renderOption={(props, t) => {
                                                                const catPath = getCategoryPath(t.categoryId, categories);
                                                                return (
                                                                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1.5 }}>
                                                                        <Chip size="sm" variant="soft"
                                                                            color={({ GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger', PATCH: 'neutral' }[t.method] as any) || 'neutral'}
                                                                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.6rem', minWidth: 44, flexShrink: 0 }}>
                                                                            {t.method}
                                                                        </Chip>
                                                                        <Box sx={{ minWidth: 0 }}>
                                                                            <Typography level="body-sm" fontWeight={600} noWrap>{t.name}</Typography>
                                                                            {catPath && (
                                                                                <Typography level="body-xs" textColor="neutral.400" noWrap>{catPath}</Typography>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <IconButton
                                                        color="danger"
                                                        variant="plain"
                                                        onClick={() => removeStep(idx)}
                                                        sx={{ mt: 3.5 }}
                                                    >
                                                        <DeleteRoundedIcon />
                                                    </IconButton>
                                                </Box>

                                                <Divider sx={{ my: 1.5 }} />

                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Typography level="body-sm" fontWeight={600}>
                                                        Data Extractions (Optional)
                                                    </Typography>
                                                    <Button size="sm" variant="plain" onClick={() => addExtraction(idx)}>
                                                        + Add Extraction
                                                    </Button>
                                                </Box>

                                                {Object.entries(step.extractions || {}).map(([key, value], eIdx) => (
                                                    <Box key={eIdx} display="flex" gap={1} mb={1}>
                                                        <Input
                                                            size="sm"
                                                            placeholder="Variable Name (e.g. TOKEN)"
                                                            value={key}
                                                            onChange={(e) => updateExtraction(idx, key, e.target.value, String(value))}
                                                            sx={{ flex: 1 }}
                                                        />
                                                        <Input
                                                            size="sm"
                                                            placeholder="JSONPath (e.g. data.token)"
                                                            value={String(value)}
                                                            onChange={(e) => updateExtraction(idx, key, key, e.target.value)}
                                                            sx={{ flex: 2 }}
                                                        />
                                                        <IconButton
                                                            size="sm"
                                                            color="danger"
                                                            variant="plain"
                                                            onClick={() => removeExtraction(idx, key)}
                                                        >
                                                            <DeleteRoundedIcon />
                                                        </IconButton>
                                                    </Box>
                                                ))}
                                                {Object.keys(step.extractions || {}).length === 0 && (
                                                    <Typography level="body-xs" color="neutral">
                                                        Extract values from response and save as variables to use in subsequent steps.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Sheet>
                                ))}
                            </Box>
                        )}

                        {steps.length > 0 && (
                            <Button variant="outlined" startDecorator={<AddRoundedIcon />} onClick={addStep} sx={{ mb: 2 }}>
                                Add Step
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Box display="flex" justifyContent="flex-end">
                    <Button
                        type="submit"
                        loading={saving}
                        startDecorator={<SaveRoundedIcon />}
                        sx={{
                            px: 4,
                            py: 1.5,
                            fontSize: '1rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            }
                        }}
                    >
                        Save Flow
                    </Button>
                </Box>
            </form>
        </Box>
    );
}
