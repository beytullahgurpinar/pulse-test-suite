import { useState } from 'react';
import {
    Sheet,
    Table,
    Button,
    Chip,
    Box,
    Typography,
    IconButton,
    Tooltip,
    Dropdown,
    Menu,
    MenuButton,
    MenuItem,
    ListDivider,
} from '@mui/joy';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import { tableStyles } from './DataTable';
import type { Flow } from '../types';
import { api } from '../api';

interface Props {
    flows: Flow[];
    onRefresh: () => void;
    onEdit: (id: number) => void;
    onRun: (id: number) => void;
    onHistory: (id: number) => void;
    runningFlowId?: number | null;
}

export function FlowList({ flows, onRefresh, onEdit, onRun, onHistory, runningFlowId = null }: Props) {
    const [deleting, setDeleting] = useState<number | null>(null);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this flow?')) return;
        setDeleting(id);
        try {
            await api.deleteFlow(id);
            onRefresh();
        } catch (err) {
            alert('Failed to delete flow');
        } finally {
            setDeleting(null);
        }
    };

    if (flows.length === 0) {
        return (
            <Sheet
                variant="outlined"
                sx={{
                    p: 8,
                    textAlign: 'center',
                    borderRadius: '12px',
                    border: '2px dashed',
                    borderColor: 'neutral.200',
                    bgcolor: 'background.level1',
                    '[data-joy-color-scheme="dark"] &': {
                        borderColor: 'neutral.300',
                    },
                }}
            >
                <Box
                    sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(76,110,245,0.1), rgba(76,110,245,0.05))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        '[data-joy-color-scheme="dark"] &': {
                            background: 'linear-gradient(135deg, rgba(76,110,245,0.2), rgba(76,110,245,0.1))',
                        },
                    }}
                >
                    <AccountTreeRoundedIcon sx={{ fontSize: 36, color: 'primary.500' }} />
                </Box>
                <Typography level="h4" fontWeight={700} sx={{ mb: 1, fontSize: '1.1rem' }}>
                    No flows yet
                </Typography>
                <Typography level="body-md" sx={{ color: 'text.secondary', mb: 2 }}>
                    Create a flow to sequence multiple tests together automatically.
                </Typography>
            </Sheet>
        );
    }

    return (
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ ...tableStyles, width: '100%', minWidth: 560, tableLayout: 'auto', bgcolor: 'transparent' }}>
                <thead>
                    <tr>
                        <th style={{ minWidth: 180 }}>Flow Name</th>
                        <th style={{ width: 100 }}>Steps</th>
                        <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {flows.map((f) => {
                        const isRunning = runningFlowId === f.id;
                        return (
                            <tr key={f.id}>
                                <td>
                                    <Typography
                                        fontWeight={600}
                                        level="title-sm"
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { color: 'primary.plainColor' },
                                            transition: 'color 0.15s ease',
                                            fontSize: '0.85rem',
                                        }}
                                        onClick={() => onEdit(f.id!)}
                                    >
                                        {f.name}
                                    </Typography>
                                </td>
                                <td>
                                    <Chip
                                        size="sm"
                                        variant="soft"
                                        color="neutral"
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {f.steps?.length || 0} step{f.steps?.length !== 1 ? 's' : ''}
                                    </Chip>
                                </td>
                                <td>
                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                                        <Tooltip title={isRunning ? 'Running...' : 'Run flow'} variant="soft" size="sm">
                                            <span>
                                                <Button
                                                    size="sm"
                                                    startDecorator={!isRunning && <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => onRun(f.id!)}
                                                    disabled={isRunning}
                                                    sx={{
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        px: 1.5,
                                                        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                                        },
                                                    }}
                                                >
                                                    {isRunning ? '...' : 'Run'}
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Dropdown>
                                            <MenuButton
                                                slots={{ root: IconButton }}
                                                slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}
                                                sx={{ '--IconButton-size': '30px' }}
                                            >
                                                <MoreVertIcon sx={{ fontSize: 18 }} />
                                            </MenuButton>
                                            <Menu
                                                size="sm"
                                                sx={{
                                                    minWidth: 170,
                                                    borderRadius: '10px',
                                                    '--ListItem-minHeight': '36px',
                                                }}
                                            >
                                                <MenuItem onClick={() => onEdit(f.id!)}>
                                                    <EditRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                                                    Edit Flow
                                                </MenuItem>
                                                <MenuItem onClick={() => onHistory(f.id!)}>
                                                    <HistoryRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                                                    History
                                                </MenuItem>
                                                <ListDivider />
                                                <MenuItem
                                                    color="danger"
                                                    onClick={() => handleDelete(f.id!)}
                                                    disabled={deleting === f.id}
                                                >
                                                    <DeleteRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                                                    {deleting === f.id ? 'Deleting...' : 'Delete Flow'}
                                                </MenuItem>
                                            </Menu>
                                        </Dropdown>
                                    </Box>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Box>
    );
}
