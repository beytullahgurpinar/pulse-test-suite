import { Box, Button, Typography, Card, Stack } from '@mui/joy';
import GoogleIcon from '@mui/icons-material/Google';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';

export function LoginPage() {
    const handleLogin = () => {
        window.location.href = '/api/auth/google/login';
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: 'background.level1',
            p: 2
        }}>
            <Card variant="soft" sx={{
                width: '100%',
                maxWidth: 400,
                p: 4,
                textAlign: 'center',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
                <Stack spacing={3} alignItems="center">
                    <Box sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #4c6ef5, #5c7cfa)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ScienceRoundedIcon sx={{ color: '#fff', fontSize: '2rem' }} />
                    </Box>
                    <Box>
                        <Typography level="h3" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
                            Pulse Suite
                        </Typography>
                        <Typography level="body-sm" sx={{ opacity: 0.7 }}>
                            Premium API Testing & Monitoring Suite
                        </Typography>
                    </Box>

                    <Button
                        size="lg"
                        variant="solid"
                        color="primary"
                        fullWidth
                        startDecorator={<GoogleIcon />}
                        onClick={handleLogin}
                        sx={{
                            mt: 2,
                            borderRadius: '12px',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(76, 110, 245, 0.3)',
                            '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s' }
                        }}
                    >
                        Login with Google
                    </Button>

                    <Typography level="body-xs" sx={{ mt: 2, opacity: 0.5 }}>
                        By logging in, you agree to our Terms of Service.
                    </Typography>
                </Stack>
            </Card>
        </Box>
    );
}
