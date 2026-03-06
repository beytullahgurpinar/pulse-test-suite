import { useParams, useNavigate } from 'react-router-dom';
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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { PageHeader } from '../components/PageHeader';
import { DataTableWrapper, DataTablePagination, tableStyles } from '../components/DataTable';
import type { EnvVar } from '../types';
import { api } from '../api';

export function EnvPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId, 10) : null;

  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formSecured, setFormSecured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const paginatedVars = useMemo(() => {
    const start = page * pageSize;
    return vars.slice(start, start + pageSize);
  }, [vars, page, pageSize]);

  const loadData = () => {
    if (!pid) return Promise.resolve();
    return api.listEnvVars(pid)
      .then((v) => {
        setVars(v);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (pid) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    } else {
      navigate('/p');
    }
  }, [pid, navigate]);

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
    if (!pid || !formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateEnvVar(editingId, { name: formName.trim(), value: formValue, secured: formSecured });
      } else {
        await api.createEnvVar({ projectId: pid, name: formName.trim(), value: formValue, secured: formSecured });
      }
      setFormOpen(false);
      loadData();
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
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!pid) return null;

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <PageHeader
        title="Environment Variables"
        description={`Use {{variable}} in URL, headers and body to reference these values.`}
        icon={<VpnKeyIcon sx={{ fontSize: 24 }} />}
        actions={
          <Button variant="soft" color="primary" startDecorator={<AddIcon />} onClick={handleOpenAdd} sx={{ fontWeight: 600 }}>
            New Variable
          </Button>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size="lg" />
        </Box>
      ) : vars.length === 0 ? (
        <Sheet
          variant="outlined"
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 'xl',
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: 'background.level1',
          }}
        >
          <Typography level="h4" fontWeight={700} sx={{ mb: 1 }}>
            No variables yet
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
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
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
    </Box>
  );
}
