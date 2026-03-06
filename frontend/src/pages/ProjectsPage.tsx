import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
  Stack,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import { PageHeader } from '../components/PageHeader';
import { DataTableWrapper, DataTablePagination, tableStyles } from '../components/DataTable';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Project } from '../types';
import { api } from '../api';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { loadProjects: refreshSidebar } = useOutletContext<{ loadProjects: () => void }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const paginatedProjects = useMemo(() => {
    const start = page * pageSize;
    return projects.slice(start, start + pageSize);
  }, [projects, page, pageSize]);

  const loadProjects = () => {
    return api.listProjects().then(setProjects).catch(console.error);
  };

  useEffect(() => {
    setLoading(true);
    loadProjects().finally(() => setLoading(false));
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateProject(editingId, { name: formName.trim() });
      } else {
        await api.createProject({ name: formName.trim() });
      }
      setFormOpen(false);
      loadProjects();
      refreshSidebar?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project and all its tests?')) return;
    try {
      await api.deleteProject(id);
      loadProjects();
      refreshSidebar?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <PageHeader
        title="Projects"
        description="Create and manage your API test projects"
        icon={<FolderIcon sx={{ fontSize: 24 }} />}
        actions={
          <Button variant="soft" color="primary" startDecorator={<AddIcon />} onClick={handleOpenAdd} sx={{ fontWeight: 600 }}>
            New Project
          </Button>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size="lg" />
        </Box>
      ) : projects.length === 0 ? (
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
            No projects yet
          </Typography>
          <Typography level="body-lg" textColor="neutral.500" sx={{ mb: 2 }}>
            Create a project to start adding tests
          </Typography>
          <Button startDecorator={<AddIcon />} onClick={handleOpenAdd} variant="soft" color="primary">
            Add Project
          </Button>
        </Sheet>
      ) : (
        <DataTableWrapper
          pagination={
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              totalItems={projects.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
            />
          }
        >
          <Table sx={tableStyles}>
            <thead>
              <tr>
                <th style={{ width: 48 }}></th>
                <th>Name</th>
                <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <FolderIcon sx={{ color: 'primary.500', fontSize: 22 }} />
                      </td>
                      <td>
                        <Typography
                          level="title-sm"
                          fontWeight={600}
                          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.600' } }}
                          onClick={() => navigate(`/p/${p.id}`)}
                        >
                          {p.name}
                        </Typography>
                      </td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="soft" color="primary" startDecorator={<OpenInNewIcon />} onClick={() => navigate(`/p/${p.id}`)} sx={{ fontWeight: 600 }}>
                            Open
                          </Button>
                          <Dropdown>
                            <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }} sx={{ '--IconButton-size': '34px' }}>
                              <MoreVertIcon />
                            </MenuButton>
                            <Menu size="sm" sx={{ minWidth: 160 }}>
                              <MenuItem onClick={() => handleOpenEdit(p)}>
                                <EditIcon sx={{ mr: 1.5 }} fontSize="small" />
                                Edit
                              </MenuItem>
                              <ListDivider />
                              <MenuItem color="danger" onClick={() => handleDelete(p.id)}>
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
        <ModalDialog layout="center" sx={{ minWidth: 400, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 2 }}>
            {editingId ? 'Edit Project' : 'New Project'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel>Project Name</FormLabel>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Stripe API Tests"
                  autoFocus
                  required
                  size="lg"
                  sx={{ '--Input-minHeight': '44px' }}
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
