import { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
  Button,
  alpha,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { api } from '../api';

const SIDEBAR_WIDTH = 260;

interface Props {
  projects: Project[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onRefresh: () => void;
  drawerOpen: boolean;
  onDrawerClose: () => void;
  onDrawerOpen: () => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function ProjectSidebar({
  projects,
  selectedId,
  onSelect,
  onRefresh,
  drawerOpen,
  onDrawerClose,
  onDrawerOpen,
  mobileMenuOpen = false,
  onMobileMenuClose = () => {},
}: Props) {
  const [addName, setAddName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    try {
      await api.createProject({ name: addName.trim() });
      setAddName('');
      setAdding(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await api.updateProject(editId, { name: editName.trim() });
      setEditId(null);
      setEditName('');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project and all its tests?')) return;
    try {
      await api.deleteProject(id);
      if (selectedId === id) onSelect(projects.find((p) => p.id !== id)?.id ?? null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}
          color="primary">
          Zotlo
        </Typography>
        <Typography variant="body2" color="text.secondary">API Test</Typography>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600}>
            Projects
          </Typography>
          <IconButton size="small" onClick={onDrawerOpen} title="Manage projects">
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>

        <List dense sx={{ py: 0 }}>
          {projects.map((p) => (
            <ListItemButton
              key={p.id}
              component={Link}
              to={`/p/${p.id}`}
              selected={selectedId === p.id}
              onClick={() => onMobileMenuClose()}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                  color: 'primary.main',
                  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.18) },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <FolderIcon fontSize="small" color={selectedId === p.id ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText primary={p.name} primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>

        {adding ? (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              autoFocus
              placeholder="Project name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setAddName(''); }
              }}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="contained" onClick={handleAdd} disabled={!addName.trim()} startIcon={<CheckIcon />}>
                Add
              </Button>
              <Button size="small" onClick={() => { setAdding(false); setAddName(''); }} startIcon={<CloseIcon />}>
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => setAdding(true)}
            sx={{
              mt: 1,
              justifyContent: 'flex-start',
              color: 'text.secondary',
              borderStyle: 'dashed',
              borderWidth: 1,
              borderRadius: 2,
              py: 1.5,
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
              },
            }}
          >
            New Project
          </Button>
        )}
      </Box>
    </Box>
  );

  const selectProject = (id: number | null) => {
    onSelect(id);
    onMobileMenuClose();
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            top: 0,
            left: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Proje yönetim drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={onDrawerClose}
        PaperProps={{
          sx: {
            width: 360,
            mt: { xs: 0, md: 0 },
            ml: { md: SIDEBAR_WIDTH },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Manage Projects
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Edit or delete your projects
          </Typography>

          <List disablePadding>
            {projects.map((p) => (
              <Box
                key={p.id}
                sx={{
                  py: 1.5,
                  px: 2,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {editId === p.id ? (
                  <>
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      fullWidth
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate();
                        if (e.key === 'Escape') { setEditId(null); setEditName(''); }
                      }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <IconButton size="small" color="primary" onClick={handleUpdate}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => { setEditId(null); setEditName(''); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <FolderIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Typography sx={{ flex: 1, fontWeight: 500 }}>{p.name}</Typography>
                    <IconButton size="small" onClick={() => { setEditId(p.id); setEditName(p.name); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            ))}
          </List>

          <Button fullWidth variant="outlined" onClick={onDrawerClose} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Drawer>

      {/* Mobile menu */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={onMobileMenuClose}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, pt: 3 }}>
          <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
            Zotlo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select project
          </Typography>
          <List dense>
            {projects.map((p) => (
              <ListItemButton
                key={p.id}
                selected={selectedId === p.id}
                onClick={() => selectProject(p.id)}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={p.name} />
              </ListItemButton>
            ))}
          </List>
          <Button
            fullWidth
            startIcon={<SettingsIcon />}
            onClick={() => { onDrawerOpen(); onMobileMenuClose(); }}
            sx={{ mt: 1, justifyContent: 'flex-start' }}
          >
            Manage projects
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
