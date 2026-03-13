import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Card,
    Sheet,
    Modal,
    ModalDialog,
    ModalClose,
    FormControl,
    FormLabel,
    Input,
    Select,
    Option,
    Divider,
} from '@mui/joy';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CreateNewFolderRoundedIcon from '@mui/icons-material/CreateNewFolderRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import type { TestRequest, RunResult, Category } from '../types';
import { api } from '../api';
import { TestList } from '../components/TestList';
import { TestResultsCards } from '../components/TestResultsCards';
import { RunResults } from '../components/RunResults';
import { RunningOverlay } from '../components/RunningOverlay';
import { PageHeader } from '../components/PageHeader';
import { EnvironmentSelect } from '../components/EnvironmentSelect';
import { ImportModal } from '../components/ImportModal';
import { useEnvironments } from '../hooks/useEnvironments';

export function TestsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const pid = projectId ? parseInt(projectId, 10) : null;

    const [tests, setTests] = useState<TestRequest[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastResult, setLastResult] = useState<RunResult | null>(null);
    const [lastTestName, setLastTestName] = useState('');
    const [lastTestId, setLastTestId] = useState<number | null>(null);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [runningAll, setRunningAll] = useState(false);
    const [runningTestId, setRunningTestId] = useState<number | null>(null);
    const [allResults, setAllResults] = useState<Array<RunResult & { testId: number; testName: string }> | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatParentId, setNewCatParentId] = useState<number | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    const { environments, selectedEnvId, setSelectedEnvId } = useEnvironments(pid);

    const loadData = async (id: number) => {
        setLoading(true);
        try {
            const [tRes, cRes] = await Promise.all([
                api.listTests(id),
                api.listCategories(id),
            ]);
            setTests(tRes);
            setCategories(cRes);
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

    const handleEdit = (id: number) => navigate(`/p/${pid}/tests/${id}/edit`);
    const handleRun = async (id: number) => {
        setLastResult(null);
        setRunningTestId(id);
        const t = tests.find((x) => x.id === id);
        try {
            const res = await api.runTest(id, selectedEnvId);
            setLastResult(res);
            setLastTestName(t?.name || '');
            setLastTestId(id);
            setResultModalOpen(true);
        } catch (e) {
            setLastResult({
                passed: false,
                statusCode: 0,
                responseBody: '',
                durationMs: 0,
                assertionResults: [],
                error: e instanceof Error ? e.message : 'Error',
            });
            setLastTestName(t?.name || '');
            setLastTestId(id);
            setResultModalOpen(true);
        } finally {
            setRunningTestId(null);
        }
    };

    const handleRunAll = async () => {
        if (!pid) return;
        setRunningAll(true);
        setAllResults(null);
        try {
            const { results } = await api.runAllTests(pid, selectedEnvId);
            setAllResults(results);
            setTests(await api.listTests(pid));
        } catch (e) {
            setAllResults([{
                testId: 0,
                testName: 'Error',
                passed: false,
                statusCode: 0,
                responseBody: '',
                durationMs: 0,
                assertionResults: [],
                error: e instanceof Error ? e.message : 'Error',
            }]);
        } finally {
            setRunningAll(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pid || !newCatName.trim()) return;
        try {
            await api.createCategory({ projectId: pid, name: newCatName.trim(), parentId: newCatParentId });
            setNewCatName('');
            setNewCatParentId(null);
            setCategoryModalOpen(false);
            loadData(pid);
        } catch (err) {
            console.error(err);
            alert('Failed to create category');
        }
    };

    if (!pid) return <Box p={3}><Typography>Select a project</Typography></Box>;

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <PageHeader
                title="Tests"
                description="Manage and run your API tests"
                icon={<FolderOpenRoundedIcon sx={{ fontSize: 22 }} />}
                actions={
                    <>
                        <Button
                            variant="outlined"
                            size="sm"
                            startDecorator={<FileUploadRoundedIcon sx={{ fontSize: 18 }} />}
                            onClick={() => setImportModalOpen(true)}
                            sx={{ fontWeight: 600, borderRadius: '8px', px: 2 }}
                        >
                            Import
                        </Button>
                        <Button
                            variant="outlined"
                            size="sm"
                            startDecorator={<CreateNewFolderRoundedIcon sx={{ fontSize: 18 }} />}
                            onClick={() => setCategoryModalOpen(true)}
                            sx={{ fontWeight: 600, borderRadius: '8px', px: 2 }}
                        >
                            New Category
                        </Button>
                        <Button
                            variant="outlined"
                            size="sm"
                            startDecorator={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                            onClick={() => navigate(`/p/${pid}/tests/new`)}
                            sx={{ fontWeight: 600, borderRadius: '8px', px: 2 }}
                        >
                            New Test
                        </Button>
                        <EnvironmentSelect
                            environments={environments}
                            value={selectedEnvId}
                            onChange={setSelectedEnvId}
                        />
                        <Button
                            size="sm"
                            startDecorator={runningAll ? <CircularProgress size="sm" /> : <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />}
                            onClick={handleRunAll}
                            disabled={runningAll || tests.length === 0}
                            sx={{
                                fontWeight: 600,
                                borderRadius: '8px',
                                px: 2,
                                background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)',
                                boxShadow: '0 2px 8px rgba(76, 110, 245, 0.25)',
                            }}
                        >
                            {runningAll ? 'Running...' : 'Run All'}
                        </Button>
                    </>
                }
            />

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress size="lg" />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {runningAll && <RunningOverlay message="Running all tests..." />}

                    {allResults && (
                        <Sheet variant="outlined" sx={{ borderRadius: '12px', p: 3 }}>
                            <TestResultsCards results={allResults} loading={false} />
                        </Sheet>
                    )}

                    <Card variant="outlined" sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px', p: 0 }}>
                        <TestList
                            tests={tests}
                            categories={categories}
                            onRefresh={() => loadData(pid)}
                            onEdit={handleEdit}
                            onRun={handleRun}
                            onDuplicate={(id) => api.duplicateTest(id).then(() => loadData(pid))}
                            onHistory={(id) => navigate(`/p/${pid}/tests/${id}/history`)}
                            runningTestId={runningTestId}
                            projectId={pid}
                        />
                    </Card>

                </Box>
            )}

            {/* Test Run Result Modal */}
            <Modal open={resultModalOpen} onClose={() => setResultModalOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ModalDialog layout="center" sx={{ width: { xs: '95vw', sm: 680 }, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 'xl', p: 0, overflow: 'hidden' }}>
                    <ModalClose sx={{ top: 14, right: 14 }} />
                    <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography level="title-lg" fontWeight={700}>{lastTestName}</Typography>
                        <Typography level="body-sm" textColor="neutral.500">Test Run Result</Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                        {lastResult && <RunResults result={lastResult} testName={lastTestName} />}
                    </Box>
                    <Divider />
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                        <Button variant="outlined" color="neutral" onClick={() => setResultModalOpen(false)}>Close</Button>
                        {lastTestId && (
                            <Button variant="soft" color="primary" onClick={() => { setResultModalOpen(false); navigate(`/p/${pid}/tests/${lastTestId}`); }}>
                                View Test Detail
                            </Button>
                        )}
                    </Box>
                </ModalDialog>
            </Modal>

            {pid && (
                <ImportModal
                    open={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    projectId={pid}
                    categories={categories}
                    onImported={() => loadData(pid)}
                />
            )}

            <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)}>
                <ModalDialog minWidth={400} sx={{ borderRadius: '12px' }}>
                    <ModalClose />
                    <Typography level="h4" fontWeight={600} mb={2}>Create Category</Typography>
                    <form onSubmit={handleCreateCategory}>
                        <FormControl sx={{ mb: 2 }}>
                            <FormLabel>Category Name</FormLabel>
                            <Input
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="e.g. Auth Service"
                                required
                                autoFocus
                            />
                        </FormControl>
                        <FormControl sx={{ mb: 3 }}>
                            <FormLabel>Parent Category (optional)</FormLabel>
                            <Select
                                placeholder="None (top-level)"
                                value={newCatParentId}
                                onChange={(_, v) => setNewCatParentId(v as number | null)}
                            >
                                <Option value={null}>None (top-level)</Option>
                                {categories.map(c => (
                                    <Option key={c.id} value={c.id}>{c.name}</Option>
                                ))}
                            </Select>
                        </FormControl>
                        <Box display="flex" justifyContent="flex-end" gap={1.5}>
                            <Button variant="plain" color="neutral" onClick={() => { setCategoryModalOpen(false); setNewCatParentId(null); }}>Cancel</Button>
                            <Button type="submit" color="primary">Create</Button>
                        </Box>
                    </form>
                </ModalDialog>
            </Modal>
        </Box>
    );
}
