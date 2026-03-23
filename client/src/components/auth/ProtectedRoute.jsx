import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ fontSize: 14, color: '#64748b' }}>Loading…</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
