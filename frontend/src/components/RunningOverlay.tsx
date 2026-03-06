import { Box, Typography, CircularProgress } from '@mui/joy';

interface Props {
  message?: string;
}

export function RunningOverlay({ message = 'Running tests...' }: Props) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.surface',
        backdropFilter: 'blur(12px)',
        borderRadius: 'inherit',
        animation: 'fadeIn 0.3s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'primary.softBg',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
            '50%': { transform: 'scale(1.05)', opacity: 0.9 },
          },
        }}
      >
        <CircularProgress size="lg" thickness={3} sx={{ '--CircularProgress-size': '48px' }} />
      </Box>
      <Typography level="title-lg" fontWeight={700} sx={{ mb: 0.5 }}>
        {message}
      </Typography>
      <Typography level="body-sm" textColor="neutral.500">
        Please wait...
      </Typography>
    </Box>
  );
}
