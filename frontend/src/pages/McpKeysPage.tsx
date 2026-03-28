import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Select,
  Option,
  Chip,
  Alert,
} from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { PageHeader } from '../components/PageHeader';
import { DataTableWrapper, tableStyles } from '../components/DataTable';
import type { McpKey, McpKeyCreated, Environment } from '../types';
import { api } from '../api';

export function McpKeysPage() {
  const { projectId } = useParams();
  const pid = projectId ? parseInt(projectId, 10) : null;

  const [keys, setKeys] = useState<McpKey[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEnvId, setFormEnvId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Revealed key modal (after create or rotate)
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyPrefix, setRevealedKeyPrefix] = useState('');
  const [copied, setCopied] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rotate confirm
  const [rotateId, setRotateId] = useState<number | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (!pid) return;
    loadAll();
  }, [pid]);

  const loadAll = async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const [keysData, envsData] = await Promise.all([
        api.listMcpKeys(pid),
        api.listEnvironments(pid),
      ]);
      setKeys(keysData);
      setEnvironments(envsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pid || !formName.trim()) return;
    setSaving(true);
    try {
      const created: McpKeyCreated = await api.createMcpKey({
        projectId: pid,
        name: formName.trim(),
        environmentId: formEnvId,
      });
      setKeys(prev => [created, ...prev]);
      setCreateOpen(false);
      setFormName('');
      setFormEnvId(null);
      // Show the key
      setRevealedKey(created.key);
      setRevealedKeyPrefix(created.keyPrefix);
      setCopied(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (!rotateId) return;
    setRotating(true);
    try {
      const rotated: McpKeyCreated = await api.rotateMcpKey(rotateId);
      setKeys(prev => prev.map(k => k.id === rotateId ? { ...k, keyPrefix: rotated.keyPrefix, updatedAt: rotated.updatedAt, lastUsedAt: null } : k));
      setRotateId(null);
      setRevealedKey(rotated.key);
      setRevealedKeyPrefix(rotated.keyPrefix);
      setCopied(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRotating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteMcpKey(deleteId);
      setKeys(prev => prev.filter(k => k.id !== deleteId));
      setDeleteId(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const envName = (envId?: number | null) => {
    if (!envId) return null;
    return environments.find(e => e.id === envId)?.name ?? `env #${envId}`;
  };

  if (!pid) return null;

  return (
    <Box>
      <PageHeader
        title="MCP Keys"
        description="Project-scoped API keys for Claude / MCP integrations. Each key is tied to a project and optionally an environment."
        icon={<KeyRoundedIcon sx={{ fontSize: 24 }} />}
        actions={
          <Button
            variant="soft"
            color="primary"
            startDecorator={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Key
          </Button>
        }
      />

      {/* Usage hint */}
      <Alert
        variant="soft"
        color="neutral"
        sx={{ mb: 3, fontSize: 'sm' }}
        startDecorator={<KeyRoundedIcon />}
      >
        <Typography level="body-sm">
          Start the MCP server with:&nbsp;
          <Box component="code" sx={{ bgcolor: 'background.level2', px: 0.75, py: 0.25, borderRadius: 'sm', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            MCP_KEY=&lt;your-key&gt; ./zotlo-mcp
          </Box>
          &nbsp;— the key determines the project and environment automatically.
        </Typography>
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : keys.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.tertiary' }}>
          <KeyRoundedIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
          <Typography level="body-md">No MCP keys yet. Create one to get started.</Typography>
        </Box>
      ) : (
      <DataTableWrapper pagination={null}>
        <Table sx={tableStyles}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key Prefix</th>
              <th>Environment</th>
              <th>Last Used</th>
              <th>Created</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id}>
                <td>
                  <Typography level="body-sm" fontWeight={600}>{k.name}</Typography>
                </td>
                <td>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="code" sx={{ bgcolor: 'background.level2', px: 1, py: 0.25, borderRadius: 'sm', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {k.keyPrefix}…
                    </Box>
                  </Box>
                </td>
                <td>
                  {envName(k.environmentId) ? (
                    <Chip size="sm" variant="soft" color="primary">{envName(k.environmentId)}</Chip>
                  ) : (
                    <Typography level="body-xs" textColor="neutral.400">Project default</Typography>
                  )}
                </td>
                <td>
                  <Typography level="body-xs" textColor="neutral.500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                  </Typography>
                </td>
                <td>
                  <Typography level="body-xs" textColor="neutral.500">
                    {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                  </Typography>
                </td>
                <td>
                  <Dropdown>
                    <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}>
                      <MoreVertIcon />
                    </MenuButton>
                    <Menu size="sm" sx={{ minWidth: 160 }}>
                      <MenuItem onClick={() => setRotateId(k.id)}>
                        <RefreshRoundedIcon sx={{ mr: 1.5 }} fontSize="small" />
                        Rotate Key
                      </MenuItem>
                      <ListDivider />
                      <MenuItem color="danger" onClick={() => setDeleteId(k.id)}>
                        <DeleteIcon sx={{ mr: 1.5 }} fontSize="small" />
                        Delete
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </DataTableWrapper>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 420, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 2 }}>New MCP Key</Typography>
          <form onSubmit={handleCreate}>
            <Stack spacing={2.5}>
              <FormControl required>
                <FormLabel>Key Name</FormLabel>
                <Input
                  placeholder="e.g. Claude Code - Local Dev"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  autoFocus
                />
              </FormControl>
              <FormControl>
                <FormLabel>Environment (optional)</FormLabel>
                <Select
                  placeholder="Use project default"
                  value={formEnvId}
                  onChange={(_, v) => setFormEnvId(v)}
                >
                  <Option value={null}>Project default</Option>
                  {environments.map(env => (
                    <Option key={env.id} value={env.id}>{env.name}</Option>
                  ))}
                </Select>
                <Typography level="body-xs" textColor="neutral.500" sx={{ mt: 0.5 }}>
                  Tests will run against this environment when using this key.
                </Typography>
              </FormControl>
              <Button type="submit" loading={saving} fullWidth>Create Key</Button>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>

      {/* Revealed Key Modal */}
      <Modal open={!!revealedKey} onClose={() => setRevealedKey(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 480, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CheckCircleRoundedIcon color="success" />
            <Typography level="title-lg" fontWeight={700}>Your MCP Key</Typography>
          </Box>
          <Alert variant="soft" color="warning" startDecorator={<WarningRoundedIcon />} sx={{ mb: 2.5 }}>
            <Typography level="body-sm" fontWeight={600}>
              Copy this key now — it will not be shown again.
            </Typography>
          </Alert>
          <Box sx={{ bgcolor: 'background.level2', borderRadius: 'md', p: 2, fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all', mb: 2 }}>
            {revealedKey}
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="solid"
              color={copied ? 'success' : 'primary'}
              startDecorator={copied ? <CheckCircleRoundedIcon /> : <ContentCopyIcon />}
              onClick={() => handleCopy(revealedKey!)}
              sx={{ flex: 1 }}
            >
              {copied ? 'Copied!' : 'Copy Key'}
            </Button>
            <Button variant="soft" color="neutral" onClick={() => setRevealedKey(null)}>Close</Button>
          </Stack>
          <Typography level="body-xs" textColor="neutral.500" sx={{ mt: 2 }}>
            Use it with:&nbsp;
            <Box component="code" sx={{ fontFamily: 'monospace' }}>
              MCP_KEY={revealedKeyPrefix}… ./zotlo-mcp
            </Box>
          </Typography>
        </ModalDialog>
      </Modal>

      {/* Rotate Confirm Modal */}
      <Modal open={!!rotateId} onClose={() => setRotateId(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 380, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 1 }}>Rotate Key?</Typography>
          <Typography level="body-sm" textColor="neutral.600" sx={{ mb: 3 }}>
            The current key will be immediately invalidated. Any integrations using it will stop working until updated with the new key.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button color="warning" loading={rotating} onClick={handleRotate} sx={{ flex: 1 }}>
              Rotate
            </Button>
            <Button variant="soft" color="neutral" onClick={() => setRotateId(null)}>Cancel</Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalDialog layout="center" sx={{ minWidth: 360, borderRadius: 'xl', p: 3 }}>
          <ModalClose sx={{ top: 16, right: 16 }} />
          <Typography level="title-lg" fontWeight={700} sx={{ mb: 1 }}>Delete Key?</Typography>
          <Typography level="body-sm" textColor="neutral.600" sx={{ mb: 3 }}>
            This action cannot be undone. Any MCP server using this key will lose access immediately.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button color="danger" loading={deleting} onClick={handleDelete} sx={{ flex: 1 }}>
              Delete
            </Button>
            <Button variant="soft" color="neutral" onClick={() => setDeleteId(null)}>Cancel</Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
