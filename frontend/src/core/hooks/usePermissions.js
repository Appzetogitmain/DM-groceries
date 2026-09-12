import { usePermissionContext } from '@core/context/PermissionContext';

/**
 * Custom hook for permission checks in admin components.
 *
 * Usage:
 *   const { hasPermission, isSuperAdmin } = usePermissions();
 *   if (hasPermission("products", "delete")) { // show delete button }
 */
export function usePermissions() {
    return usePermissionContext();
}

export default usePermissions;
