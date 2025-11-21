import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../api/client';

export default function ProtectedRoute({ children }) {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const token = getToken();
        setIsAuthenticated(!!token);
        setIsChecking(false);
    }, []);

    if (isChecking) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>
                    Loading...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }

    return children;
}
