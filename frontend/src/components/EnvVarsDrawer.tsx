import { useState, useEffect } from 'react';
import {
  Drawer,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  alpha,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { EnvVar } from '../types';
import { api } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  projectName: string;
}

export function EnvVarsDrawer({ open, onClose, projectId, projectName }: Props) {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          p: 3,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Environment Variables
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {projectName || 'Select project'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use <code style={{ background: alpha('#6366f1', 0.1), padding: '2px 6px', borderRadius: 4 }}>{'{{variable}}'}</code> in URL, headers and body.
        </Typography>

        {/* Add form */}
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            New Variable
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              placeholder="base_url"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              size="small"
              placeholder="https://api.example.com"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              sx={{ flex: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!addName.trim()}
          >
            Add
          </Button>
        </Box>

        {/* List */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Defined Variables
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {vars.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  color: 'text.secondary',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2">No variables yet</Typography>
                <Typography variant="caption">Add from the form above</Typography>
              </Box>
            ) : (
              vars.map((v) => (
                <Box
                  key={v.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {editId === v.id ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        size="small"
                        label="Ad"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        size="small"
                        label="Value"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="contained" onClick={handleUpdate} startIcon={<CheckIcon />}>
                          Save
                        </Button>
                        <Button size="small" onClick={() => setEditId(null)} startIcon={<CloseIcon />}>
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            fontFamily: 'monospace',
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {`{{${v.name}}}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }} noWrap>
                          {v.value}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => copyToClipboard(`{{${v.name}}}`)} title="Copy">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
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
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}

        <Button variant="outlined" onClick={onClose} fullWidth sx={{ mt: 2 }}>
          Close
        </Button>
      </Box>
    </Drawer>
  );
}
