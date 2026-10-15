import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { label: 'Home', icon: Home, path: '/user', exact: true },
    { label: 'Category', icon: LayoutGrid, path: '/user/categories' },
    { label: 'Orders', icon: ShoppingBag, path: '/user/orders' },
    { label: 'Profile', icon: User, path: '/user/profile' },
];

const isItemActive = (item, pathname) => {
    const current = pathname.replace(/\/+$/, '') || '/';
    // Home is only active on the home page itself; "/user" is a prefix of every customer route.
    if (item.exact) return current === item.path;
    return current === item.path || current.startsWith(`${item.path}/`);
};

const BottomNav = () => {
    const location = useLocation();

    return (
        <nav
            aria-label="Main navigation"
            className="fixed bottom-0 left-0 right-0 z-[500] md:hidden rounded-t-[24px] border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-6px_24px_rgba(0,0,0,0.08)] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        >
            <ul className="mx-auto flex max-w-md items-stretch justify-between">
                {navItems.map((item) => {
                    const active = isItemActive(item, location.pathname);

                    return (
                        <li key={item.path} className="flex-1">
                            <Link
                                to={item.path}
                                aria-current={active ? 'page' : undefined}
                                className="flex flex-col items-center gap-1 py-1 active:scale-95 transition-transform"
                            >
                                <span
                                    className={cn(
                                        'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-300',
                                        active ? 'bg-[#1A4516]/10' : 'bg-transparent'
                                    )}
                                >
                                    <item.icon
                                        size={22}
                                        strokeWidth={active ? 2.5 : 2}
                                        className={cn(
                                            'transition-colors duration-300',
                                            active ? 'text-[#1A4516]' : 'text-gray-400'
                                        )}
                                    />
                                </span>
                                <span
                                    className={cn(
                                        'text-[11px] leading-none tracking-tight transition-colors duration-300',
                                        active ? 'font-extrabold text-[#1A4516]' : 'font-semibold text-gray-400'
                                    )}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNav;
