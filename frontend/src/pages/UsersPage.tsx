import { useState, useEffect } from 'react';
import {
    Box, Typography, Avatar, Chip, Select, Option,
    IconButton, Button, Input, Sheet, Table, Tooltip,
    CircularProgress, Snackbar,
} from '@mui/joy';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';

type WorkspaceUser = { id: number; email: string; name: string; avatar: string; role: string; isSelf: boolean; createdAt: string };
type Invitation = { id: number; email: string; role: string; token: string; used: boolean; createdAt: string };

export function UsersPage() {
    const [users, setUsers] = useState<WorkspaceUser[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'editor' | 'admin'>('editor');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const load = () => {
        setLoading(true);
        Promise.all([
            api.listUsers().then((d) => setUsers(d ?? [])),
            api.listInvitations().then((d) => setInvitations(d ?? [])),
        ])
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await api.updateUser(userId, { role });
            load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Remove this user from the workspace?')) return;
        try {
            await api.deleteUser(userId);
            setSuccess('User removed');
            load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleAddMember = async () => {
        if (!newEmail.trim()) { setError('Email is required'); return; }
        setError('');
        try {
            await api.createInvitation({ email: newEmail.trim(), role: newRole });
            setNewEmail('');
            setSuccess(`${newEmail.trim()} added — they will join on their next Google login`);
            load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleCancelPending = async (id: number) => {
        try {
            await api.deleteInvitation(id);
            load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
            <PageHeader
                title="Team Members"
                subtitle={`${users.length} members`}
                description="Manage who has access to this workspace"
                icon={<GroupRoundedIcon sx={{ fontSize: 22 }} />}
            />

            {/* Add Member */}
            <Sheet
                variant="outlined"
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: '12px',
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <PersonAddRoundedIcon sx={{ color: 'primary.500', fontSize: 20 }} />
                <Input
                    placeholder="email@example.com"
                    type="email"
                    size="sm"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                    sx={{ flex: 1, minWidth: 200 }}
                />
                <Select
                    size="sm"
                    value={newRole}
                    onChange={(_, val) => val && setNewRole(val as 'editor' | 'admin')}
                    sx={{ minWidth: 110 }}
                >
                    <Option value="editor">Editor</Option>
                    <Option value="admin">Admin</Option>
                </Select>
                <Button size="sm" onClick={handleAddMember}>
                    Add Member
                </Button>
            </Sheet>

            {loading ? (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Active Members */}
                    <Sheet variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', mb: 3 }}>
                        <Table
                            hoverRow
                            sx={{
                                '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
                                '& thead th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.tertiary' },
                                '& tbody td': { py: 1.5 },
                            }}
                        >
                            <thead>
                                <tr>
                                    <th style={{ width: 48, paddingLeft: 16 }}></th>
                                    <th>Member</th>
                                    <th style={{ width: 160 }}>Role</th>
                                    <th style={{ width: 56 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td style={{ paddingLeft: 16 }}>
                                            <Avatar
                                                src={u.avatar || undefined}
                                                size="sm"
                                                sx={{ bgcolor: 'primary.500', fontSize: '0.75rem', fontWeight: 700 }}
                                            >
                                                {u.name?.[0] || u.email?.[0]}
                                            </Avatar>
                                        </td>
                                        <td>
                                            <Box>
                                                <Typography level="body-sm" fontWeight={600}>
                                                    {u.name || u.email}
                                                    {u.isSelf && (
                                                        <Chip size="sm" color="primary" variant="soft" sx={{ ml: 1, fontSize: '0.65rem' }}>You</Chip>
                                                    )}
                                                </Typography>
                                                {u.name && (
                                                    <Typography level="body-xs" textColor="text.tertiary">{u.email}</Typography>
                                                )}
                                            </Box>
                                        </td>
                                        <td>
                                            <Select
                                                size="sm"
                                                variant="plain"
                                                value={u.role}
                                                disabled={u.isSelf}
                                                onChange={(_, val) => val && handleRoleChange(u.id, val)}
                                                sx={{ minWidth: 100 }}
                                            >
                                                <Option value="admin">Admin</Option>
                                                <Option value="editor">Editor</Option>
                                            </Select>
                                        </td>
                                        <td>
                                            {!u.isSelf && (
                                                <Tooltip title="Remove from workspace">
                                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDeleteUser(u.id)}>
                                                        <DeleteRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Sheet>

                    {/* Pending Members */}
                    {invitations.length > 0 && (
                        <>
                            <Typography level="title-sm" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary' }}>
                                <HourglassEmptyRoundedIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />
                                Pending ({invitations.length})
                            </Typography>
                            <Sheet variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                                <Table
                                    sx={{
                                        '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
                                        '& thead th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.tertiary' },
                                        '& tbody td': { py: 1.5 },
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft: 16 }}>Email</th>
                                            <th style={{ width: 120 }}>Role</th>
                                            <th style={{ width: 56 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invitations.map((inv) => (
                                            <tr key={inv.id}>
                                                <td style={{ paddingLeft: 16 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography level="body-sm">{inv.email}</Typography>
                                                        <Chip size="sm" variant="soft" color="warning" sx={{ fontSize: '0.6rem' }}>
                                                            Awaiting login
                                                        </Chip>
                                                    </Box>
                                                </td>
                                                <td>
                                                    <Chip size="sm" variant="soft" color={inv.role === 'admin' ? 'warning' : 'neutral'}>
                                                        {inv.role === 'admin' ? 'Admin' : 'Editor'}
                                                    </Chip>
                                                </td>
                                                <td>
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleCancelPending(inv.id)}>
                                                            <DeleteRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Sheet>
                        </>
                    )}
                </>
            )}

            {/* Notifications */}
            <Snackbar
                open={!!error}
                color="danger"
                variant="soft"
                autoHideDuration={4000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                {error}
            </Snackbar>
            <Snackbar
                open={!!success}
                color="success"
                variant="soft"
                autoHideDuration={4000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                startDecorator={<CheckCircleRoundedIcon />}
            >
                {success}
            </Snackbar>
        </Box>
    );
}
