import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';

const RoleGuard = ({ children, allowedRoles }) => {
    const { role, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return null; // Let ProtectedRoute handle the loading spinner
    }

    const publicPaths = ['/delivery/terms', '/delivery/privacy', '/seller/terms', '/seller/privacy'];
    if (publicPaths.includes(location.pathname)) {
        return <>{children}</>;
    }

    if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
        // Redirect to their respective dashboard if they are logged in but trying to access the wrong area
        if (isAuthenticated && role) {
            return <Navigate to={`/${role}`} replace />;
        }
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default RoleGuard;
