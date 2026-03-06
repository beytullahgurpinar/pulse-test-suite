import { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import type { Project } from '../types';
import { api } from '../api';

interface Props {
  projects: Project[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onRefresh: () => void;
}

export function ProjectSelector({ projects, selectedId, onSelect, onRefresh }: Props) {
  const [manageOpen, setManageOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.createProject({ name: newName.trim() });
      setNewName('');
      setAddOpen(false);
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
      if (selectedId === id) onSelect(projects[0]?.id ?? null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Proje</InputLabel>
          <Select
            value={selectedId ?? ''}
            label="Proje"
            onChange={(e) => onSelect((e.target.value as number) || null)}
            displayEmpty
            renderValue={(v) => (v ? projects.find((p) => p.id === v)?.name : 'Select project')}
          >
            {projects.length === 0 && (
              <MenuItem value="" disabled>No projects</MenuItem>
            )}
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton size="small" onClick={() => setManageOpen(true)} title="Manage projects">
          <SettingsIcon />
        </IconButton>
      </Box>

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Projects</DialogTitle>
        <DialogContent>
          <List>
            {projects.map((p) => (
              <ListItem key={p.id}>
                {editId === p.id ? (
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      fullWidth
                      autoFocus
                    />
                    <Button size="small" onClick={handleUpdate}>Save</Button>
                    <Button size="small" onClick={() => { setEditId(null); setEditName(''); }}>Cancel</Button>
                  </Box>
                ) : (
                  <>
                    <ListItemText primary={p.name} />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => { setEditId(p.id); setEditName(p.name); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </>
                )}
              </ListItem>
            ))}
          </List>
          <Button startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ mt: 1 }}>
            New Project
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle>New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!newName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
