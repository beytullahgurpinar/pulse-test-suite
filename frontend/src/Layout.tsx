import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Drawer,
  Select,
  Option,
  Divider,
} from '@mui/joy';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import type { Project } from './types';
import { api } from './api';
import { ColorSchemeToggle } from './components/ColorSchemeToggle';

const SIDEBAR_WIDTH = 260;

export function Layout() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<any>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Tracks the last explicitly selected project so sidebar stays populated on global pages
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProjects = () => {
    api.listProjects().then(setProjects).catch(console.error);
  };

  useEffect(() => {
    loadProjects();
    api.getMe().then((u) => {
      setUser(u);
      if (u.lastProjectId) setActiveProjectId(u.lastProjectId);
    }).catch((err) => {
      // 401 Unauthorized is already handled globally by fetchApi (removes token + redirect)
      // Do not log out the user for transient errors (network, 5xx, etc.)
      console.error('Failed to load user profile:', err);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const projectIdFromPath = (): number | null => {
    const m = location.pathname.match(/^\/p\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const currentProjectId = projectIdFromPath();

  // When URL carries a project ID, keep activeProjectId in sync
  useEffect(() => {
    if (currentProjectId) setActiveProjectId(currentProjectId);
  }, [currentProjectId]);

  // sidebarProjectId: prefer URL project (for accurate active-highlight), fall back to last selected
  const sidebarProjectId = currentProjectId ?? activeProjectId;

  const handleSelectProject = (id: number | null) => {
    if (!id) return;
    setActiveProjectId(id);
    api.updateLastProject(id).catch(console.error); // fire-and-forget persistence
    // Stay on the same tab if we're already inside a project page
    const parts = location.pathname.split('/');
    if (parts.length >= 4 && parts[1] === 'p') {
      const tab = parts[3]; // tests, flows, env, schedules
      navigate(`/p/${id}/${tab}`);
    } else {
      navigate(`/p/${id}/tests`);
    }
  };

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { label: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard', global: true, adminOnly: false },
    { label: 'Tests', icon: <ScienceRoundedIcon />, path: '/p/:id/tests', global: false, adminOnly: false },
    { label: 'Flows', icon: <AccountTreeRoundedIcon />, path: '/p/:id/flows', global: false, adminOnly: false },
    { label: 'Results', icon: <AssessmentRoundedIcon />, path: '/p/:id/results', global: false, adminOnly: false },
    { label: 'Schedules', icon: <ScheduleRoundedIcon />, path: '/p/:id/schedules', global: false, adminOnly: false },
    { label: 'Environment', icon: <VpnKeyRoundedIcon />, path: '/p/:id/env', global: false, adminOnly: false },
    { label: 'Manage Projects', icon: <SettingsRoundedIcon />, path: '/projects', global: true, adminOnly: true },
    { label: 'Users', icon: <GroupRoundedIcon />, path: '/users', global: true, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
      {/* Project Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography level="body-xs" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, color: 'text.tertiary' }}>
          Active Project
        </Typography>
        <Select
          value={sidebarProjectId}
          placeholder="Select Project"
          onChange={(_, val) => handleSelectProject(val)}
          startDecorator={<FolderRoundedIcon sx={{ color: 'primary.500' }} />}
          sx={{
            borderRadius: '12px',
            bgcolor: 'background.surface',
            boxShadow: 'sm',
            '--Select-minHeight': '44px',
          }}
        >
          {projects.map(p => (
            <Option key={p.id} value={p.id}>{p.name}</Option>
          ))}
        </Select>
      </Box>

      <Divider sx={{ mb: 3, opacity: 0.6 }} />

      {/* Navigation */}
      <List
        size="md"
        sx={{
          flex: 1,
          '--List-gap': '8px',
          '--ListItem-radius': '10px',
        }}
      >
        {navItems.map((item) => {
          const isGlobal = item.global;
          const activePath = isGlobal ? item.path : item.path.replace(':id', String(sidebarProjectId || ''));
          const isActive = location.pathname.startsWith(activePath) && (isGlobal || currentProjectId !== null);
          const isDisabled = !isGlobal && !sidebarProjectId;

          return (
            <ListItemButton
              key={item.label}
              component={isDisabled ? 'div' : Link}
              to={isDisabled ? undefined : activePath}
              selected={isActive}
              disabled={isDisabled}
              onClick={() => setMobileDrawerOpen(false)}
              sx={{
                transition: 'all 0.2s',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'primary.plainColor' : 'text.secondary',
                bgcolor: isActive ? 'primary.softBg' : 'transparent',
                '&:hover': {
                  bgcolor: isActive ? 'primary.softBg' : 'background.level1',
                  transform: 'translateX(4px)',
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }
              }}
            >
              <ListItemDecorator sx={{ color: isActive ? 'primary.500' : 'inherit' }}>
                {item.icon}
              </ListItemDecorator>
              <ListItemContent>{item.label}</ListItemContent>
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer Info */}
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', mt: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Typography sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </Typography>
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography level="body-xs" fontWeight={700} noWrap>{user?.name || user?.email}</Typography>
            <Typography level="body-xs" textColor="neutral.500" noWrap>
              {user?.role === 'admin' ? 'Admin' : 'Editor'} • {user?.workspace?.name}
            </Typography>
          </Box>
          <IconButton size="sm" variant="plain" color="neutral" onClick={handleLogout}>
            <LogoutRoundedIcon />
          </IconButton>
        </Box>
        <Typography level="body-xs" textAlign="center" sx={{ opacity: 0.5 }}>
          Pulse Suite v1.3.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.body' }}>
      {/* Sidebar Desktop */}
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: SIDEBAR_WIDTH,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          height: '100vh',
          position: 'sticky',
          top: 0,
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScienceRoundedIcon sx={{ color: '#fff' }} />
          </Box>
          <Typography level="title-md" fontWeight={800} letterSpacing="-0.02em">Pulse</Typography>
          <Box sx={{ ml: 'auto' }}>
            <ColorSchemeToggle />
          </Box>
        </Box>
        {sidebarContent}
      </Box>

      {/* Mobile Header */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', position: 'fixed', top: 0, zIndex: 1100, bgcolor: 'background.surface', borderBottom: '1px solid', borderColor: 'divider', p: 1, alignItems: 'center' }}>
        <IconButton variant="plain" onClick={() => setMobileDrawerOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Typography level="title-md" fontWeight={800} sx={{ ml: 1 }}>Pulse</Typography>
        <Box sx={{ ml: 'auto' }}>
          <ColorSchemeToggle />
        </Box>
      </Box>

      <Drawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
        {sidebarContent}
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
          mt: { xs: '52px', md: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet context={{ projects, currentProjectId, loadProjects }} />
      </Box>
    </Box>
  );
}
