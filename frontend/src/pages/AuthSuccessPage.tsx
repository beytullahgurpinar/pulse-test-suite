import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/joy';

export function AuthSuccessPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('token', token);
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    }, []);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2
        }}>
            <CircularProgress thickness={4} sx={{ '--CircularProgress-size': '64px' }} />
            <Typography level="title-lg" fontWeight={700}>Authenticating...</Typography>
        </Box>
    );
}
