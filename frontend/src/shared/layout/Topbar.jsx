import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@core/context/AuthContext';
import {
    HiOutlineLogout,
    HiOutlineUserCircle,
    HiOutlineBell,
    HiOutlineSearch,
    HiOutlineMenu
} from 'react-icons/hi';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sellerApi } from '@/modules/seller/services/sellerApi';
import { adminApi } from '@/modules/admin/services/adminApi';
import { AnimatePresence } from 'framer-motion';
import NotificationPopup from './NotificationPopup';
import { toast } from 'sonner';

import { useSettings } from '@core/context/SettingsContext';
import { onNotificationNew, wakeOrderSocket } from '@core/services/orderSocket';
import { playNotificationSound } from '@/lib/soundUtils';
import { showSystemNotification } from '@/core/firebase/pushClient';
import AppZetoBridge, { APP_RESUME_EVENT, NATIVE_PUSH_EVENT } from '@/lib/appZetoBridge';
import { canUseBrowserNotifications, isFlutterWebView, hasNativeFlutterBridge, shouldTreatDocumentAsVisible } from '@/core/utils/deviceUtils';

const Topbar = ({ onMenuClick }) => {
    const { user, logout, role, token } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();

    const appName = settings?.appName || 'App';
    const logoUrl = "/Logo.png";

    const [searchQuery, setSearchQuery] = React.useState('');
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const notificationRef = React.useRef(null);

    const isSeller = location.pathname.startsWith('/seller');
    const isAdmin = location.pathname.startsWith('/admin');

    const handleSearchSubmit = (e) => {
        e?.preventDefault();
        const q = (searchQuery || '').trim();
        if (!q) return;
        if (isSeller) {
            navigate(`/seller/products?q=${encodeURIComponent(q)}`);
        }
    };

    // Stable refs so the socket / visibility listeners don't need to
    // re-bind whenever React re-renders the topbar for unrelated reasons.
    const isSellerRef = React.useRef(isSeller);
    const isAdminRef = React.useRef(isAdmin);
    React.useEffect(() => { isSellerRef.current = isSeller; }, [isSeller]);
    React.useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    const ignoreOutsideUntilRef = React.useRef(0);

    const fetchNotifications = React.useCallback(async () => {
        try {
            const sellerMode = isSellerRef.current;
            const adminMode = isAdminRef.current;
            if (!sellerMode && !adminMode) return;
            const response = sellerMode
                ? await sellerApi.getNotifications()
                : await adminApi.getNotifications();
            if (response.data.success) {
                setNotifications(response.data.result.notifications);
                setUnreadCount(response.data.result.unreadCount);
            }
        } catch (error) {
            console.error("Notif Fetch Error:", error);
        }
    }, []);

    // Event-driven refresh: subscribe to `notification:new` for the
    // current admin/seller and refetch on any in-app delta. The 60s
    // poll below is now a degraded safety net for environments where
    // the socket can't connect (CSP, proxy, etc.) — primary path is
    // the socket. Tab focus also triggers an immediate refresh so a
    // user returning to a backgrounded tab sees a fresh badge.
    React.useEffect(() => {
        if (!isSeller && !isAdmin) return undefined;
        fetchNotifications();

        const getToken = () => token;
        let scheduled = null;
        const refresh = (payload) => {
            if (payload && payload.title) {
                toast.info(payload.title, { description: payload.body || undefined });
                if (AppZetoBridge.isFlutterApp() || hasNativeFlutterBridge()) {
                    AppZetoBridge.showNativeNotification({
                        title: payload.title,
                        body: payload.body || '',
                        data: payload.data || {},
                    });
                } else if (canUseBrowserNotifications() && Notification.permission === 'granted') {
                    showSystemNotification({ title: payload.title, body: payload.body || '' });
                }
            }
            if (scheduled) return;
            // Debounce: bursts of notifications (e.g. bulk order accept)
            // shouldn't trigger N concurrent refetches.
            scheduled = setTimeout(() => {
                scheduled = null;
                fetchNotifications();
                playNotificationSound();
            }, 200);
        };

        const offNotification = token ? onNotificationNew(getToken, refresh) : null;

        const onNativePush = () => {
            wakeOrderSocket();
            fetchNotifications();
        };
        const unsubscribeNative = AppZetoBridge.subscribe(onNativePush);
        window.addEventListener(NATIVE_PUSH_EVENT, onNativePush);
        window.addEventListener(APP_RESUME_EVENT, onNativePush);

        // Degraded fallback. Flutter WebView often reports visibilityState
        // "hidden" while the seller is looking at the app, so never skip polls
        // there — and poll more often because sockets/WebPush are unreliable.
        const FALLBACK_POLL_MS = isFlutterWebView() ? 15000 : 60000;
        const poll = setInterval(() => {
            if (!shouldTreatDocumentAsVisible()) {
                return;
            }
            fetchNotifications();
        }, FALLBACK_POLL_MS);

        const onVisibility = () => {
            if (shouldTreatDocumentAsVisible()) {
                wakeOrderSocket();
                fetchNotifications();
            }
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }
        window.addEventListener('pageshow', onNativePush);
        window.addEventListener('focus', onNativePush);
        window.addEventListener('online', onNativePush);

        return () => {
            if (scheduled) clearTimeout(scheduled);
            clearInterval(poll);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
            window.removeEventListener('pageshow', onNativePush);
            window.removeEventListener('focus', onNativePush);
            window.removeEventListener('online', onNativePush);
            window.removeEventListener(NATIVE_PUSH_EVENT, onNativePush);
            window.removeEventListener(APP_RESUME_EVENT, onNativePush);
            unsubscribeNative();
            if (typeof offNotification === 'function') offNotification();
        };
    }, [isSeller, isAdmin, token, fetchNotifications]);

    // Handle Click Outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (Date.now() < ignoreOutsideUntilRef.current) return;
            const target = event.target;
            if (target?.closest?.('[data-seller-notifications]')) return;
            if (notificationRef.current && notificationRef.current.contains(target)) return;
            setShowNotifications(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('pointerdown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('pointerdown', handleClickOutside);
        };
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            if (!id) return;
            if (isSeller) await sellerApi.markNotificationRead(id);
            if (isAdmin) await adminApi.markNotificationRead(id);
            fetchNotifications();
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            if (isSeller) await sellerApi.markAllNotificationsRead();
            if (isAdmin) await adminApi.markAllNotificationsRead();
            fetchNotifications();
            toast.success("All caught up!");
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <header className={cn(
            "bg-white border-b border-slate-100 flex items-center justify-between transition-all duration-300",
            "fixed top-0 left-0 md:left-72 right-0 z-40 h-14 px-4 md:h-16 md:px-6"
        )}>
            <div className="flex items-center flex-1 mr-4 overflow-hidden">
                <button
                    onClick={onMenuClick}
                    className="p-2.5 mr-3 bg-gray-100/80 hover:bg-white rounded-xl text-gray-600 hover:text-[#1A4516] transition-all duration-300 md:hidden border border-transparent hover:border-[#1A4516]/20 shadow-sm"
                >
                    <HiOutlineMenu className="h-5 w-5" />
                </button>

                {/* Mobile Logo */}
                <div className="flex items-center space-x-2 mr-4 md:hidden">
                    {logoUrl ? (
                        <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-[#1A4516]/10 border border-gray-100">
                            <img src={logoUrl} alt={appName} className="h-full w-full object-contain" />
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded-lg bg-[#1A4516] flex items-center justify-center text-white font-black text-sm shadow-md">
                            {appName.charAt(0)}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-[400px] group hidden md:block">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#1A4516] transition-all duration-300" />
                    <input
                        type="text"
                        placeholder={isSeller ? "Search products by name or SKU..." : "Search anything..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-transparent rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#1A4516]/10 focus:border-[#1A4516]/20 transition-all duration-500 outline-none"
                    />
                </form>
            </div>

            <div className="flex items-center space-x-4 relative z-50">
                <div className="relative z-50" ref={notificationRef} data-seller-notifications="bell">
                    <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowNotifications((prev) => !prev);
                        }}
                        className={cn(
                            "p-2 hover:bg-[#1A4516]/5 text-gray-500 hover:text-[#1A4516] rounded-xl transition-all duration-300 relative group cursor-pointer",
                            showNotifications && "bg-[#1A4516]/5 text-[#1A4516]"
                        )}
                    >
                        <HiOutlineBell className="h-5 w-5 pointer-events-none" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white shadow-sm pointer-events-none"></span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <NotificationPopup
                                notifications={notifications}
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
                                onClose={() => setShowNotifications(false)}
                                disableAnimation={isFlutterWebView() || hasNativeFlutterBridge()}
                            />
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-8 w-px bg-gray-100 mx-1"></div>
                <button
                    onClick={() => {
                        if (location.pathname.startsWith('/admin')) {
                            navigate('/admin/profile');
                        } else if (location.pathname.startsWith('/seller')) {
                            navigate('/seller/profile');
                        } else if (location.pathname.startsWith('/delivery')) {
                            navigate('/delivery/profile');
                        } else {
                            navigate('/profile');
                        }
                    }}
                    className="flex items-center space-x-2.5 p-1 pr-3 hover:bg-gray-50 rounded-xl transition-all duration-300 group ring-1 ring-transparent hover:ring-gray-100 shadow-sm hover:shadow-md"
                >
                    <div className="h-8 w-8 rounded-lg bg-[#1A4516] flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
                        {user?.name?.[0] || 'A'}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{user?.name || 'Demo User'}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{user?.role || 'Member'}</p>
                    </div>
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 font-bold text-xs shadow-sm hover:shadow-rose-100/50"
                >
                    <HiOutlineLogout className="h-4 w-4" />
                    <span className="hidden lg:block">Sign Out</span>
                </button>
            </div>
        </header>
    );
};

export default Topbar;

