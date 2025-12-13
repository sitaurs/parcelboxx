import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function AuthGuard({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, checkAuth } = useStore();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Check PIN Lock
        const lastActive = localStorage.getItem('pinLockTime');
        if (lastActive) {
            const timeSince = Date.now() - parseInt(lastActive);
            if (timeSince > INACTIVITY_TIMEOUT) {
                navigate('/pin-lock');
            } else {
                // Refresh timer
                localStorage.setItem('pinLockTime', Date.now().toString());
            }
        } else {
            navigate('/pin-lock');
        }
    }, [isAuthenticated, location, navigate]);

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
