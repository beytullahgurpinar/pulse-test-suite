import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/joy';

export function InvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }
        // Store the invite token in a short-lived cookie so GoogleCallback can pick it up
        document.cookie = `invite_token=${token}; path=/; max-age=600; SameSite=Lax`;
        window.location.href = '/api/auth/google/login';
    }, []);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
        }}>
            <CircularProgress thickness={4} sx={{ '--CircularProgress-size': '64px' }} />
            <Typography level="title-lg" fontWeight={700}>Joining workspace...</Typography>
        </Box>
    );
}
