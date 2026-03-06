import { useState, useEffect } from 'react';
import { useColorScheme } from '@mui/joy/styles';
import { IconButton, Tooltip } from '@mui/joy';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';

export function ColorSchemeToggle() {
  const { mode, setMode, systemMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <IconButton
        variant="plain"
        color="neutral"
        size="sm"
        sx={{
          '--IconButton-size': '34px',
          borderRadius: '8px',
        }}
      >
        <LightModeRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    );
  }

  const resolvedMode = mode === 'system' ? systemMode : mode;
  const isDark = resolvedMode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light' : 'Switch to dark'} variant="soft" size="sm">
      <IconButton
        variant="plain"
        color="neutral"
        size="sm"
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        sx={{
          '--IconButton-size': '34px',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'neutral.100',
            transform: 'rotate(15deg)',
            '[data-joy-color-scheme="dark"] &': {
              bgcolor: 'neutral.200',
            },
          },
        }}
      >
        {isDark ? (
          <LightModeRoundedIcon sx={{ fontSize: 18, color: 'warning.400' }} />
        ) : (
          <DarkModeRoundedIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
