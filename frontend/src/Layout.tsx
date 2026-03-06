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
import type { Project } from './types';
import { api } from './api';
import { ColorSchemeToggle } from './components/ColorSchemeToggle';

const SIDEBAR_WIDTH = 260;

export function Layout() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProjects = () => {
    api.listProjects().then(setProjects).catch(console.error);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const projectIdFromPath = (): number | null => {
    const m = location.pathname.match(/^\/p\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const currentProjectId = projectIdFromPath();

  // If we have projects but no current project selected in path (and we are not on global pages), 
  // we might want to default to the first project? 
  // Actually, let's just use the currentProjectId if available.

  const handleSelectProject = (id: number | null) => {
    if (!id) return;
    // Current behavior: if we change project, we stay on the same "tab" if possible
    const parts = location.pathname.split('/');
    if (parts.length >= 4 && parts[1] === 'p') {
      const tab = parts[3]; // tests, flows, env
      navigate(`/p/${id}/${tab}`);
    } else {
      navigate(`/p/${id}/tests`);
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard', global: true },
    { label: 'Tests', icon: <ScienceRoundedIcon />, path: '/p/:id/tests', global: false },
    { label: 'Flows', icon: <AccountTreeRoundedIcon />, path: '/p/:id/flows', global: false },
    { label: 'Schedules', icon: <ScheduleRoundedIcon />, path: '/p/:id/schedules', global: false },
    { label: 'Environment', icon: <VpnKeyRoundedIcon />, path: '/p/:id/env', global: false },
    { label: 'Manage Projects', icon: <SettingsRoundedIcon />, path: '/projects', global: true },
  ];

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
      {/* Project Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography level="body-xs" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, color: 'text.tertiary' }}>
          Active Project
        </Typography>
        <Select
          value={currentProjectId}
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
          const activePath = isGlobal ? item.path : item.path.replace(':id', String(currentProjectId || ''));
          const isActive = location.pathname.startsWith(activePath) && (isGlobal || currentProjectId !== null);
          const isDisabled = !isGlobal && !currentProjectId;

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
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider', mt: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>D</Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography level="body-xs" fontWeight={700}>Pulse Test Suite</Typography>
          <Typography level="body-xs" textColor="neutral.500">v1.3.0 • Premium</Typography>
        </Box>
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
