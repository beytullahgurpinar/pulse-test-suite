import { Box, Typography } from '@mui/joy';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, description, actions, icon }: PageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 3,
        px: { xs: 2, md: 3 },
        py: 2.5,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'neutral.200',
        bgcolor: 'background.surface',
        position: 'relative',
        overflow: 'hidden',
        '[data-joy-color-scheme="dark"] &': {
          borderColor: 'neutral.300',
          bgcolor: 'background.surface',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: 'linear-gradient(180deg, #4c6ef5 0%, #748ffc 100%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -60,
          top: -60,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76, 110, 245, 0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(76, 110, 245, 0.1) 0%, rgba(116, 143, 252, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.500',
                flexShrink: 0,
                '[data-joy-color-scheme="dark"] &': {
                  background: 'linear-gradient(135deg, rgba(76, 110, 245, 0.15) 0%, rgba(116, 143, 252, 0.1) 100%)',
                },
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              level="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
                fontSize: { xs: '1rem', md: '1.15rem' },
              }}
            >
              {title}
              {subtitle != null && subtitle !== '' && (
                <>
                  {' '}
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: 400,
                      color: 'text.tertiary',
                      fontSize: 'inherit',
                    }}
                  >
                    — {subtitle}
                  </Typography>
                </>
              )}
            </Typography>
            {description && (
              <Typography
                level="body-sm"
                sx={{
                  mt: 0.5,
                  color: 'text.tertiary',
                  fontSize: '0.78rem',
                }}
              >
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
}
