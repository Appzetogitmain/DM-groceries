import React from 'react';
import { usePermissionContext } from '@core/context/PermissionContext';

const DefaultFallback = () => null;

/**
 * Permission-based guard component for admin panel routes and UI elements.
 *
 * Usage:
 *   <PermissionGuard section="orders" action="view" fallback={<AccessDenied />}>
 *     <OrdersList />
 *   </PermissionGuard>
 *
 *   <PermissionGuard section="products" action="delete">
 *     <DeleteButton />
 *   </PermissionGuard>
 */
const PermissionGuard = ({
    children,
    section,
    action = 'view',
    fallback: Fallback = DefaultFallback,
    superAdminOnly = false,
}) => {
    const { hasPermission, isSuperAdmin } = usePermissionContext();

    if (superAdminOnly) {
        if (!isSuperAdmin()) {
            return typeof Fallback === 'function' ? <Fallback /> : Fallback;
        }
        return <>{children}</>;
    }

    if (!hasPermission(section, action)) {
        return typeof Fallback === 'function' ? <Fallback /> : Fallback;
    }

    return <>{children}</>;
};

export default PermissionGuard;
