import { createContext, useContext } from 'react';

/**
 * Optional text provider for the shared dashboard layout (Sidebar, Topbar,
 * NotificationPopup, DashboardLayout).
 *
 * The default returns the English fallback unchanged, so panels that do not
 * provide it (Admin) render exactly as before. The Seller panel provides a
 * translator bound to its own i18n instance.
 *
 * Usage inside a layout component:
 *   const lt = useLayoutText();
 *   lt('layout.logoutTitle', 'Log out');
 *   lt('alerts.orderAccepted', 'Order #{{id}} Accepted!', { id });
 */
const interpolate = (text, vars) =>
    vars ? String(text).replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars[k] ?? '')) : text;

const defaultTranslate = (_key, fallback, vars) => interpolate(fallback, vars);

export const LayoutTextContext = createContext(defaultTranslate);

export const useLayoutText = () => useContext(LayoutTextContext);
