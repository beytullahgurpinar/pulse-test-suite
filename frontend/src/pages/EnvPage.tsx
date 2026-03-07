import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Sheet,
  Table,
  Input,
  FormControl,
  FormLabel,
  IconButton,
  CircularProgress,
  Modal,
  ModalDialog,
  ModalClose,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListDivider,
  Tooltip,
  Stack,
  Checkbox,
  Chip,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import { PageHeader } from '../components/PageHeader';
import { DataTableWrapper, DataTablePagination, tableStyles } from '../components/DataTable';
import type { EnvVar, Environment } from '../types';
import { api } from '../api';

export function EnvPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pid = projectId ? parseInt(projectId, 10) : null;

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [envFormOpen, setEnvFormOpen] = useState(false);
  const [envFormName, setEnvFormName] = useState('');
  const [editingEnvId, setEditingEnvId] = useState<number | null>(null);
  const [envSaving, setEnvSaving] = useState(false);

  // Env vars
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formSecured, setFormSecured] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const paginatedVars = useMemo(() => {
    const start = page * pageSize;
    return vars.slice(start, start + pageSize);
  }, [vars, page, pageSize]);

  // Load environments
  const loadEnvironments = async () => {
    if (!pid) return;
    try {
      const envs = await api.listEnvironments(pid);
      setEnvironments(envs ?? []);
      // Auto-select default environment if none selected
      if (envs && envs.length > 0) {
        const currentSelected = envs.find(e => e.id === selectedEnvId);
        if (!currentSelected) {
          const def = envs.find(e => e.isDefault) || envs[0];
          setSelectedEnvId(def.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load env vars for selected environment
  const loadVars = () => {
    if (!pid || !selectedEnvId) return Promise.resolve();
    return api.listEnvVars(pid, selectedEnvId)
      .then((v) => setVars(v ?? []))
      .catch(console.error);
  };

  useEffect(() => {
    if (pid) {
      setLoading(true);
      loadEnvironments().finally(() => setLoading(false));
    } else {
      navigate('/p');
    }
  }, [pid]);

  useEffect(() => {
    if (selectedEnvId) {
      loadVars();
    }
  }, [selectedEnvId]);

  // Environment CRUD
  const handleCreateEnv = async () => {
    if (!pid || !envFormName.trim()) return;
    setEnvSaving(true);
    try {
      if (editingEnvId) {
        await api.updateEnvironment(editingEnvId, { name: envFormName.trim() });
      } else {
        const created = await api.createEnvironment({ projectId: pid, name: envFormName.trim() });
        setSelectedEnvId(created.id);
      }
      setEnvFormOpen(false);
      setEnvFormName('');
      setEditingEnvId(null);
      await loadEnvironments();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setEnvSaving(false);
    }
  };

  const handleSetDefault = async (envId: number) => {
    try {
      await api.updateEnvironment(envId, { isDefault: true });
      await loadEnvironments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEnv = async (envId: number) => {
    if (!confirm('Delete this environment and all its variables?')) return;
    try {
      await api.deleteEnvironment(envId);
      if (selectedEnvId === envId) setSelectedEnvId(null);
      await loadEnvironments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRenameEnv = (env: Environment) => {
    setEditingEnvId(env.id);
    setEnvFormName(env.name);
    setEnvFormOpen(true);
  };

  const handleDuplicateEnv = async (envId: number) => {
    try {
      const created = await api.duplicateEnvironment(envId);
      await loadEnvironments();
      setSelectedEnvId(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate');
    }
  };

  // Env var CRUD
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormValue('');
    setFormSecured(false);
    setFormOpen(true);
  };

  const handleOpenEdit = async (v: EnvVar) => {
    setEditingId(v.id);
    setFormName(v.name);
    setFormSecured(v.secured ?? false);
    if (v.secured) {
      try {
        const full = await api.getEnvVar(v.id);
        setFormValue(full.value);
      } catch {
        setFormValue('');
      }
    } else {
      setFormValue(v.value);
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || !selectedEnvId || !formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateEnvVar(editingId, { name: formName.trim(), value: formValue, secured: formSecured });
      } else {
        await api.createEnvVar({ projectId: pid, environmentId: selectedEnvId, name: formName.trim(), value: formValue, secured: formSecured });
      }
      setFormOpen(false);
      loadVars();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this environment variable?')) return;
    try {
      await api.deleteEnvVar(id);
      loadVars();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!pid) return null;

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <PageHeader
        title="Environment Variables"
        description="Use {{variable}} in URL, headers and body. Variables are scoped to each environment."
        icon={<VpnKeyIcon sx={{ fontSize: 24 }} />}
        actions={
          selectedEnvId ? (
            <Button variant="soft" color="primary" startDecorator={<AddIcon />} onClick={handleOpenAdd} sx={{ fontWeight: 600 }}>
              New Variable
            </Button>
          ) : undefined
        }
      />

      {/* Environment Tabs */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size="lg" />
        </Box>
      ) : (
        <>
          {/* Environment Tabs */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            mb: 3,
            p: 0.5,
            bgcolor: 'background.level1',
            borderRadius: 'lg',
            overflowX: 'auto',
            border: '1px solid',
            borderColor: 'divider',
          }}>
            {environments.map((env) => (
              <Button
                key={env.id}
                variant={selectedEnvId === env.id ? 'solid' : 'plain'}
                color={selectedEnvId === env.id ? 'primary' : 'neutral'}
                onClick={() => setSelectedEnvId(env.id)}
                startDecorator={env.isDefault ? <StarRoundedIcon sx={{ fontSize: 16 }} /> : undefined}
                sx={{
                  borderRadius: 'md',
                  fontWeight: selectedEnvId === env.id ? 700 : 500,
                  px: 2,
                  py: 1,
                  minWidth: 'fit-content',
                  transition: 'background-color 0.2s, color 0.2s',
                  ...(selectedEnvId === env.id && {
                    boxShadow: 'sm'
                  })
                }}
              >
                {env.name}
              </Button>
            ))}
            <Button
              variant="plain"
              color="neutral"
              onClick={() => { setEditingEnvId(null); setEnvFormName(''); setEnvFormOpen(true); }}
              startDecorator={<AddIcon />}
              sx={{ borderRadius: 'md', fontWeight: 600, minWidth: 'fit-content' }}
            >
              Add Group
            </Button>
          </Box>

          {/* Action bar for selected environment */}
          {selectedEnv && (
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 3,
              p: 2.5,
              bgcolor: 'background.surface',
              borderRadius: 'xl',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'sm'
            }}>
              <Box>
                <Typography level="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {selectedEnv.name}
                  {selectedEnv.isDefault && (
                    <Chip size="sm" variant="soft" color="primary" sx={{ fontWeight: 600 }}>Default</Chip>
                  )}
                </Typography>
                <Typography level="body-sm" textColor="neutral.500">
                  Manage environment variables for the {selectedEnv.name} group.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="sm" variant="outlined" color="neutral" startDecorator={<EditIcon />} onClick={() => handleRenameEnv(selectedEnv)}>
                  Rename
                </Button>
                <Button size="sm" variant="outlined" color="neutral" startDecorator={<FileCopyRoundedIcon />} onClick={() => handleDuplicateEnv(selectedEnv.id)}>
                  Duplicate
                </Button>
                {!selectedEnv.isDefault && (
                  <Button size="sm" variant="outlined" color="warning" startDecorator={<StarOutlineRoundedIcon />} onClick={() => handleSetDefault(selectedEnv.id)}>
                    Set Default
                  </Button>
                )}
                {!selectedEnv.isDefault && (
                  <Button size="sm" variant="soft" color="danger" startDecorator={<DeleteIcon />} onClick={() => handleDeleteEnv(selectedEnv.id)}>
                    Delete
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* Env Vars Table */}
          {!selectedEnvId ? (
            <Sheet variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 'xl', border: '2px dashed', borderColor: 'divider', bgcolor: 'background.level1' }}>
              <Typography level="h4" fontWeight={700} sx={{ mb: 1 }}>Select an environment</Typography>
              <Typography level="body-lg" textColor="neutral.500">Choose an environment above to view its variables</Typography>
            </Sheet>
          ) : vars.length === 0 ? (
            <Sheet variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 'xl', border: '2px dashed', borderColor: 'divider', bgcolor: 'background.level1' }}>
              <Typography level="h4" fontWeight={700} sx={{ mb: 1 }}>
                No variables in "{selectedEnv?.name}"
              </Typography>
              <Typography level="body-lg" textColor="neutral.500" sx={{ mb: 2 }}>
                Add variables to use in your test URLs and headers
              </Typography>
              <Button startDecorator={<AddIcon />} onClick={handleOpenAdd} variant="soft" color="primary">
                Add Variable
              </Button>
            </Sheet>
          ) : (
            <DataTableWrapper
              pagination={
                <DataTablePagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={vars.length}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              }
            >
              <Table sx={tableStyles}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th style={{ width: 90 }}>Secured</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVars.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Typography
                          level="body-sm"
                          fontWeight={600}
                          sx={{ fontFamily: 'monospace', bgcolor: 'primary.softBg', px: 1.5, py: 0.5, borderRadius: 'md', display: 'inline-block' }}
                        >
                          {`{{${v.name}}}`}
                        </Typography>
                      </td>
                      <td>
                        <Typography level="body-sm" sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.value || '(empty)'}
                        </Typography>
                      </td>
                      <td>
                        {v.secured ? (
                          <Chip size="sm" variant="soft" color="warning" sx={{ fontWeight: 600 }}>
                            Secured
                          </Chip>
                        ) : (
                          <Typography level="body-sm" textColor="neutral.500">—</Typography>
                        )}
                      </td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Tooltip title="Copy placeholder">
                            <IconButton size="sm" variant="soft" color="neutral" onClick={() => copyToClipboard(`{{${v.name}}}`)} sx={{ '--IconButton-size': '34px' }}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Dropdown>
                            <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }} sx={{ '--IconButton-size': '34px' }}>
                              <MoreVertIcon />
                            </MenuButton>
                            <Menu size="sm" sx={{ minWidth: 160 }}>
                              <MenuItem onClick={() => handleOpenEdit(v)}>
                                <EditIcon sx={{ mr: 1.5 }} fontSize="small" />
                                Edit
                              </MenuItem>
                              <ListDivider />
                              <MenuItem color="danger" onClick={() => handleDelete(v.id)}>
                                <DeleteIcon sx={{ mr: 1.5 }} fontSize="small" />
                                Delete
                              </MenuItem>
                            </Menu>
                          </Dropdown>
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </DataTableWrapper>
          )}
        </>
      )}

      {/* Env Var Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 420, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 2 }}>
            {editingId ? 'Edit Variable' : 'New Variable'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. base_url"
                  autoFocus
                  required
                  size="lg"
                  sx={{ '--Input-minHeight': '44px' }}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Value</FormLabel>
                <Input
                  type={formSecured ? 'password' : 'text'}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formSecured ? '••••••••' : 'e.g. https://api.example.com'}
                  size="lg"
                  sx={{ '--Input-minHeight': '44px' }}
                />
              </FormControl>
              <FormControl>
                <Checkbox
                  checked={formSecured}
                  onChange={(e) => setFormSecured(e.target.checked)}
                  label="Secured (encrypt in DB, mask in history)"
                  sx={{ fontWeight: 500 }}
                />
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', pt: 1 }}>
                <Button variant="outlined" onClick={() => setFormOpen(false)} sx={{ fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" color="primary" disabled={saving || !formName.trim()} sx={{ fontWeight: 600 }}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </Box>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>

      {/* Environment Name Modal */}
      <Modal open={envFormOpen} onClose={() => setEnvFormOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 360, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 2 }}>
            {editingEnvId ? 'Rename Environment' : 'New Environment'}
          </Typography>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateEnv(); }}>
            <Stack spacing={2.5}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={envFormName}
                  onChange={(e) => setEnvFormName(e.target.value)}
                  placeholder="e.g. Production, Staging, Dev"
                  autoFocus
                  required
                  size="lg"
                  sx={{ '--Input-minHeight': '44px' }}
                />
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', pt: 1 }}>
                <Button variant="outlined" onClick={() => setEnvFormOpen(false)} sx={{ fontWeight: 600 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" color="primary" disabled={envSaving || !envFormName.trim()} sx={{ fontWeight: 600 }}>
                  {envSaving ? 'Saving...' : editingEnvId ? 'Rename' : 'Create'}
                </Button>
              </Box>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
