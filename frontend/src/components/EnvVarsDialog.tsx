import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  Typography,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { EnvVar } from '../types';
import { api } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  projectName: string;
}

export function EnvVarsDialog({ open, onClose, projectId, projectName }: Props) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [addName, setAddName] = useState('');
  const [addValue, setAddValue] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (open && projectId) {
      setLoading(true);
      api.listEnvVars(projectId)
        .then(setVars)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setVars([]);
    }
    setEditId(null);
    setAddName('');
    setAddValue('');
  }, [open, projectId]);

  const handleAdd = async () => {
    if (!projectId || !addName.trim()) return;
    try {
      await api.createEnvVar({ projectId, environmentId: 0, name: addName.trim(), value: addValue, secured: false });
      setAddName('');
      setAddValue('');
      const list = await api.listEnvVars(projectId);
      setVars(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await api.updateEnvVar(editId, { name: editName.trim(), value: editValue });
      setEditId(null);
      if (projectId) {
        const list = await api.listEnvVars(projectId);
        setVars(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this environment variable?')) return;
    try {
      await api.deleteEnvVar(id);
      if (projectId) {
        const list = await api.listEnvVars(projectId);
        setVars(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Environment Variables — {projectName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use <code>{'{{variable_name}}'}</code> in URL, headers and body to reference these values.
          E.g.: <code>{'{{base_url}}/api/users'}</code>, <code>{'{{api_key}}'}</code>
        </Typography>

        {loading ? (
          <Box py={2}>Loading...</Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ad</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell width={80} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vars.map((v) => (
                    <TableRow key={v.id}>
                      {editId === v.id ? (
                        <TableCell colSpan={3}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              size="small"
                              label="Ad"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              sx={{ width: 150 }}
                            />
                            <TextField
                              size="small"
                              label="Value"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              sx={{ flex: 1 }}
                            />
                            <Button size="small" onClick={handleUpdate}>Save</Button>
                            <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
                          </Box>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell><code>{'{{' + v.name + '}}'}</code></TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.value}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={async () => {
                              setEditId(v.id);
                              setEditName(v.name);
                              setEditValue(v.secured ? (await api.getEnvVar(v.id).catch(() => ({ value: '' }))).value : v.value);
                            }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(v.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label="Name (e.g. base_url)"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="base_url"
                sx={{ width: 160 }}
              />
              <TextField
                size="small"
                label="Value"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="https://api.example.com"
                sx={{ flex: 1 }}
              />
              <Button startIcon={<AddIcon />} onClick={handleAdd} disabled={!addName.trim()}>
                Add
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
