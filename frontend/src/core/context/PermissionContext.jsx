import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@core/context/AuthContext';

const PermissionContext = createContext(undefined);

/**
 * Permission sections map — mirrors the backend ADMIN_SECTIONS constant.
 * Used for building the permission assignment UI.
 */
export const ADMIN_SECTIONS = {
    dashboard: { label: "Dashboard", actions: ["view"] },
    categories: { label: "Categories", actions: ["view", "create", "delete"] },
    products: { label: "Products", actions: ["view", "create", "delete"] },
    marketing: { label: "Marketing Tools", actions: ["view", "create", "delete"] },
    support: { label: "Customer Support", actions: ["view", "create"] },
    sellers: { label: "Sellers", actions: ["view", "create", "delete"] },
    delivery: { label: "Delivery Drivers", actions: ["view", "create", "delete"] },
    wallet: { label: "Wallet", actions: ["view"] },
    withdrawals: { label: "Money Requests", actions: ["view", "create"] },
    seller_transactions: { label: "Seller Payments", actions: ["view"] },
    cash_collection: { label: "Collect Cash", actions: ["view", "create"] },
    customers: { label: "Customers", actions: ["view", "create"] },
    faqs: { label: "FAQs", actions: ["view", "create", "delete"] },
    orders: { label: "Orders", actions: ["view", "create"] },
    billing: { label: "Fees & Charges", actions: ["view", "create"] },
    settings: { label: "Settings", actions: ["view", "create"] },
    sub_admins: { label: "Sub Admin Management", actions: ["view", "create", "delete"] },
};

export const PermissionProvider = ({ children }) => {
    const { user, role } = useAuth();

    const adminType = useMemo(() => {
        if (role !== 'admin') return null;
        return user?.adminType || 'super_admin';
    }, [user, role]);

    const permissions = useMemo(() => {
        if (role !== 'admin') return {};
        if (!user?.permissions) return {};
        // Permissions from the API are a plain object { section: [actions] }
        return user.permissions;
    }, [user, role]);

    const isSuperAdmin = useCallback(() => {
        return adminType === 'super_admin';
    }, [adminType]);

    /**
     * Check if the current admin has a specific permission.
     * Super admins always return true.
     */
    const hasPermission = useCallback((section, action = 'view') => {
        // Non-admin roles don't have admin permissions
        if (role !== 'admin') return false;

        // Super admins have all permissions
        if (adminType === 'super_admin') return true;

        // Sub admins: check the permissions map
        const sectionPerms = permissions[section];
        if (!Array.isArray(sectionPerms)) return false;

        return sectionPerms.includes(action);
    }, [role, adminType, permissions]);

    /**
     * Check if the current admin has view permission for any of the given sections.
     * Useful for showing/hiding nav groups with multiple sub-items.
     */
    const hasAnyPermission = useCallback((sections) => {
        if (role !== 'admin') return false;
        if (adminType === 'super_admin') return true;

        return sections.some((section) => {
            const sectionPerms = permissions[section];
            return Array.isArray(sectionPerms) && sectionPerms.length > 0;
        });
    }, [role, adminType, permissions]);

    const value = useMemo(() => ({
        adminType,
        permissions,
        isSuperAdmin,
        hasPermission,
        hasAnyPermission,
    }), [adminType, permissions, isSuperAdmin, hasPermission, hasAnyPermission]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissionContext = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissionContext must be used within a PermissionProvider');
    }
    return context;
};

export default PermissionContext;
