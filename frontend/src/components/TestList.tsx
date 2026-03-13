import { useState, useMemo } from 'react';
import {
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
  Sheet,
  Input,
} from '@mui/joy';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderIcon from '@mui/icons-material/Folder';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { useNavigate } from 'react-router-dom';
import { tableStyles } from './DataTable';
import type { TestRequest, Category } from '../types';
import { api } from '../api';

interface Props {
  tests: TestRequest[];
  categories?: Category[];
  onRefresh: () => void;
  onEdit: (id: number) => void;
  onRun: (id: number) => void;
  onDuplicate?: (id: number) => void;
  onHistory?: (id: number) => void;
  runningTestId?: number | null;
  projectId?: number | null;
}

export function TestList({ tests, categories = [], onRefresh, onEdit, onRun, onDuplicate, onHistory, runningTestId = null, projectId = null }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggleCollapse = (id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRunClick = async (id: number) => {
    try {
      await onRun(id);
    } finally {
      // Parent handles running state
    }
  };

  const handleDuplicate = async (id: number) => {
    if (!onDuplicate) return;
    setDuplicating(id);
    try {
      await onDuplicate(id);
    } finally {
      setDuplicating(null);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this test?')) return;
    setDeleting(id);
    try {
      await api.deleteTest(id);
      onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCategory = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this category? Tests inside will become uncategorized.')) return;
    try {
      await api.deleteCategory(id);
      onRefresh();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  if (tests.length === 0 && categories.length === 0) {
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
          <ScienceRoundedIcon sx={{ fontSize: 36, color: 'primary.500' }} />
        </Box>
        <Typography level="h4" fontWeight={700} sx={{ mb: 1, fontSize: '1.1rem' }}>
          No tests yet
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary', mb: 2 }}>
          Create your first test or category.
        </Typography>
      </Sheet>
    );
  }

  const filteredTests = useMemo(() => {
    if (!query.trim()) return tests;
    const q = query.toLowerCase();
    return tests.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.method.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q)
    );
  }, [tests, query]);

  // Build category tree
  type CatNode = Category & { children: CatNode[] };
  const categoryTree = useMemo((): CatNode[] => {
    const map = new Map<number, CatNode>();
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));
    const roots: CatNode[] = [];
    categories.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(map.get(c.id)!);
      } else {
        roots.push(map.get(c.id)!);
      }
    });
    return roots;
  }, [categories]);

  const testsByCategory = useMemo(() => {
    const groups: Record<string, TestRequest[]> = { 'uncategorized': [] };
    categories.forEach(cat => { groups[cat.id.toString()] = []; });
    filteredTests.forEach(t => {
      if (t.categoryId && groups[t.categoryId.toString()] !== undefined) {
        groups[t.categoryId.toString()].push(t);
      } else {
        groups['uncategorized'].push(t);
      }
    });
    return groups;
  }, [filteredTests, categories]);

  const renderTestRow = (t: TestRequest) => {
    const isRunning = runningTestId === t.id;
    return (
      <tr key={t.id}>
        <td>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 4,
                height: 24,
                borderRadius: 4,
                bgcolor: isRunning ? 'warning.400' : 'primary.400',
                transition: 'all 0.2s ease',
              }}
            />
            <Typography
              fontWeight={600}
              level="title-sm"
              sx={{
                cursor: 'pointer',
                '&:hover': { color: 'primary.plainColor' },
                transition: 'color 0.15s ease',
                fontSize: '0.85rem',
              }}
              onClick={() => navigate(`/p/${projectId}/tests/${t.id}`)}
            >
              {t.name}
            </Typography>
          </Box>
        </td>
        <td>
          <Chip
            size="sm"
            variant="soft"
            color={{
              GET: 'success',
              POST: 'primary',
              PUT: 'warning',
              DELETE: 'danger',
              PATCH: 'neutral',
            }[t.method as string] as any || 'neutral'}
            sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.65rem' }}
          >
            {t.method}
          </Chip>
        </td>
        <td>
          <Typography
            level="body-xs"
            fontFamily="monospace"
            sx={{
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
            }}
          >
            {t.url}
          </Typography>
        </td>
        <td>
          <Chip
            size="sm"
            variant="outlined"
            color="neutral"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              bgcolor: 'background.surface',
            }}
          >
            {t.assertions?.length || 0}
          </Chip>
        </td>
        <td>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Tooltip title={isRunning ? 'Running...' : 'Run test'} variant="soft" size="sm">
              <span>
                <Button
                  size="sm"
                  startDecorator={!isRunning && <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleRunClick(t.id!)}
                  disabled={isRunning}
                  sx={{
                    fontWeight: 600,
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    px: 1.5,
                    background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)',
                    boxShadow: '0 2px 8px rgba(76, 110, 245, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4263eb 0%, #4c6ef5 100%)',
                      boxShadow: '0 4px 12px rgba(76, 110, 245, 0.35)',
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
                  minWidth: 160,
                  borderRadius: '10px',
                  '--ListItem-minHeight': '36px',
                  boxShadow: 'md',
                }}
              >
                <MenuItem onClick={() => onEdit(t.id!)}>
                  <EditRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  Edit
                </MenuItem>
                {onDuplicate && (
                  <MenuItem onClick={() => handleDuplicate(t.id!)} disabled={duplicating === t.id}>
                    <ContentCopyRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                    {duplicating === t.id ? 'Duplicating...' : 'Duplicate'}
                  </MenuItem>
                )}
                {onHistory && (
                  <MenuItem onClick={() => onHistory(t.id!)}>
                    <HistoryRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                    History
                  </MenuItem>
                )}
                <ListDivider />
                <MenuItem
                  color="danger"
                  onClick={(e) => handleDelete(t.id!, e)}
                  disabled={deleting === t.id}
                >
                  <DeleteRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  {deleting === t.id ? 'Deleting...' : 'Delete'}
                </MenuItem>
              </Menu>
            </Dropdown>
          </Box>
        </td>
      </tr>
    );
  };

  const renderCategoryTree = (cat: CatNode, depth: number = 0): React.ReactNode => {
    const key = cat.id.toString();
    const groupTests = testsByCategory[key] || [];
    const indent = depth * 20;
    const isCollapsed = collapsed.has(cat.id);
    const totalCount = groupTests.length + cat.children.reduce((acc, c) => acc + (testsByCategory[c.id.toString()]?.length || 0), 0);

    return (
      <>
        <tbody key={key}>
          <tr style={{ background: 'transparent' }}>
            <td colSpan={5} style={{ padding: 0, borderBottom: 'none' }}>
              <Box
                onClick={() => toggleCollapse(cat.id)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  pl: `${16 + indent}px`, pr: 2, py: 1.5,
                  bgcolor: depth === 0 ? 'background.level1' : 'background.level2',
                  borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { bgcolor: depth === 0 ? 'background.level2' : 'neutral.100' },
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  {depth > 0 && (
                    <Box sx={{ width: 12, height: 1, bgcolor: 'neutral.300', mr: 0.5 }} />
                  )}
                  <Box sx={{ color: 'text.tertiary', display: 'flex', alignItems: 'center', mr: 0.5 }}>
                    {isCollapsed
                      ? <KeyboardArrowRightRoundedIcon sx={{ fontSize: 16 }} />
                      : <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
                    }
                  </Box>
                  {isCollapsed
                    ? <FolderIcon color={depth === 0 ? 'primary' : 'action'} sx={{ fontSize: depth === 0 ? 20 : 16 }} />
                    : <FolderOpenIcon color={depth === 0 ? 'primary' : 'action'} sx={{ fontSize: depth === 0 ? 20 : 16 }} />
                  }
                  <Typography level="title-sm" fontWeight={depth === 0 ? 700 : 600} fontSize={depth === 0 ? '0.85rem' : '0.8rem'}>
                    {cat.name}
                  </Typography>
                  <Chip size="sm" variant="soft" color="neutral" sx={{ borderRadius: 'xl', fontSize: '0.6rem', fontWeight: 700 }}>
                    {isCollapsed ? totalCount : groupTests.length}
                  </Chip>
                </Box>
                <IconButton size="sm" variant="plain" color="danger"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, e); }}
                  sx={{ '--IconButton-size': '24px' }}>
                  <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </td>
          </tr>
          {!isCollapsed && groupTests.length === 0 && cat.children.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '12px', paddingLeft: `${16 + indent + 20}px` }}>
                <Typography level="body-xs" color="neutral" fontStyle="italic">No tests in this category.</Typography>
              </td>
            </tr>
          )}
          {!isCollapsed && groupTests.map(renderTestRow)}
        </tbody>
        {!isCollapsed && cat.children.map((child: CatNode) => renderCategoryTree(child, depth + 1))}
      </>
    );
  };

  const renderUncategorized = () => {
    const groupTests = testsByCategory['uncategorized'] || [];
    if (groupTests.length === 0 && categories.length > 0) return null;
    return (
      <tbody key="uncategorized">
        <tr style={{ background: 'transparent' }}>
          <td colSpan={5} style={{ padding: 0, borderBottom: 'none' }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.5, bgcolor: 'background.level1',
              borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
            }}>
              <FolderIcon sx={{ fontSize: 20, color: 'text.tertiary' }} />
              <Typography level="title-sm" fontWeight={700} sx={{ letterSpacing: '0.02em' }}>Uncategorized</Typography>
              <Chip size="sm" variant="soft" color="neutral" sx={{ borderRadius: 'xl', fontSize: '0.65rem', fontWeight: 700 }}>
                {groupTests.length}
              </Chip>
            </Box>
          </td>
        </tr>
        {groupTests.map(renderTestRow)}
      </tbody>
    );
  };

  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const isSearching = query.trim().length > 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Search bar */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Input
          size="sm"
          placeholder="Search by name, method or URL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startDecorator={<SearchRoundedIcon sx={{ fontSize: 18, color: 'text.tertiary' }} />}
          endDecorator={
            query ? (
              <IconButton size="sm" variant="plain" color="neutral" onClick={() => setQuery('')}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : null
          }
          sx={{ borderRadius: 'lg', '--Input-minHeight': '36px' }}
        />
      </Box>

      {/* Search results: flat list */}
      {isSearching && (
        filteredTests.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography level="body-md" textColor="neutral.500">No tests match "{query}"</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ ...tableStyles, minWidth: 600, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Test Name</th>
                  <th style={{ width: '10%' }}>Method</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '23%' }}>URL</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map(t => (
                  <tr key={t.id}>
                    <td>
                      <Typography
                        fontWeight={600}
                        level="title-sm"
                        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.plainColor' }, fontSize: '0.85rem' }}
                        onClick={() => navigate(`/p/${projectId}/tests/${t.id}`)}
                      >
                        {t.name}
                      </Typography>
                    </td>
                    <td>
                      <Chip size="sm" variant="soft"
                        color={({ GET: 'success', POST: 'primary', PUT: 'warning', DELETE: 'danger', PATCH: 'neutral' }[t.method] as any) || 'neutral'}
                        sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.65rem' }}
                      >
                        {t.method}
                      </Chip>
                    </td>
                    <td>
                      {t.categoryId && categoryMap[t.categoryId] ? (
                        <Chip size="sm" variant="soft" color="neutral" sx={{ fontSize: '0.7rem' }}>
                          {categoryMap[t.categoryId]}
                        </Chip>
                      ) : (
                        <Typography level="body-xs" textColor="neutral.400">—</Typography>
                      )}
                    </td>
                    <td>
                      <Typography level="body-xs" fontFamily="monospace"
                        sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {t.url}
                      </Typography>
                    </td>
                    <td>{/* reuse actions */}
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Button size="sm" onClick={() => onRun(t.id!)} disabled={runningTestId === t.id}
                          sx={{ fontWeight: 600, borderRadius: '8px', fontSize: '0.75rem', px: 1.5,
                            background: 'linear-gradient(135deg, #4c6ef5 0%, #5c7cfa 100%)' }}>
                          {runningTestId === t.id ? '...' : 'Run'}
                        </Button>
                        <Dropdown>
                          <MenuButton slots={{ root: IconButton }} slotProps={{ root: { variant: 'plain', color: 'neutral', size: 'sm' } }}
                            sx={{ '--IconButton-size': '30px' }}>
                            <MoreVertIcon sx={{ fontSize: 18 }} />
                          </MenuButton>
                          <Menu size="sm" sx={{ minWidth: 160, borderRadius: '10px' }}>
                            <MenuItem onClick={() => onEdit(t.id!)}><EditRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />Edit</MenuItem>
                            {onHistory && <MenuItem onClick={() => onHistory(t.id!)}><HistoryRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />History</MenuItem>}
                            <ListDivider />
                            <MenuItem color="danger" onClick={() => handleDelete(t.id!)}><DeleteRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />Delete</MenuItem>
                          </Menu>
                        </Dropdown>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Box>
        )
      )}

      {/* Normal grouped view */}
      {!isSearching && <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Table
        sx={{
          ...tableStyles,
          width: '100%',
          minWidth: 600,
          tableLayout: 'fixed',
          bgcolor: 'transparent',
          '& tbody:first-of-type tr:first-of-type td > div': {
            borderTop: 'none',
          },
          '& thead th': {
            borderBottom: 'none',
            bgcolor: 'background.surface',
            color: 'text.tertiary',
          },
          '& tbody tr:hover': {
            bgcolor: 'background.level1',
          },
        }}
      >
        <thead>
          <tr>
            <th style={{ width: '38%' }}>Test Name</th>
            <th style={{ width: '12%' }}>Method</th>
            <th style={{ width: '25%' }}>URL endpoint</th>
            <th style={{ width: '10%' }}>Asserts</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        {categoryTree.map((c) => renderCategoryTree(c))}
        {renderUncategorized()}
      </Table>
    </Box>}
    </Box>
  );
}
