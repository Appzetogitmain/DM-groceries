import React, { useState, useEffect } from 'react';
import { Bell, Lock, User, Globe, ChevronRight, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { useAuth } from '@core/context/AuthContext';
import { toast } from 'sonner';
import Button from '@/shared/components/ui/Button';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/shared/hooks/useConfirmDialog';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const confirm = useConfirmDialog();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await customerApi.getProfile();
                if (res?.data?.success) {
                    const profile = res.data.result || res.data.data || res.data.customer;
                    // Default to true if not set
                    setNotificationsEnabled(profile?.notificationsEnabled ?? true);
                }
            } catch (err) {
                console.error("Failed to fetch profile settings", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const toggleNotifications = async () => {
        const newStatus = !notificationsEnabled;
        setNotificationsEnabled(newStatus); // optimistic update
        
        try {
            await customerApi.updateProfile({ notificationsEnabled: newStatus });
            toast.success(`Notifications ${newStatus ? 'enabled' : 'disabled'}`);
        } catch (error) {
            setNotificationsEnabled(!newStatus); // revert on failure
            toast.error("Failed to update settings");
        }
    };
    const promptDeleteAccount = () => {
        confirm.open({
            title: "Delete Account",
            message: "Are you sure you want to delete your account? This action cannot be undone.",
            confirmLabel: "Delete Account",
            cancelLabel: "Cancel",
            onConfirm: async () => {
                try {
                    await customerApi.deleteAccount();
                    toast.success("Account deleted successfully.");
                    logout();
                } catch (error) {
                    toast.error("Failed to delete account.");
                    console.error("Delete account error:", error);
                    throw error;
                }
            }
        });
    };

    const promptLogout = () => {
        confirm.open({
            title: "Log out",
            message: "Are you sure you want to log out?",
            confirmLabel: "Log out",
            cancelLabel: "Cancel",
            onConfirm: () => {
                logout();
            }
        });
    };

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* White Header */}
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-[#1A4516]" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-[#1A4516] tracking-tight">Settings</h1>
                    <p className="text-[#1A4516]/70 text-xs font-medium mt-0.5">Configure your app preferences</p>
                </div>
            </div>

            {/* Main Container */}
            <div className="px-4 pt-2 pb-12 space-y-5">
                
                {/* General Section */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="px-4 pt-4 pb-2 bg-transparent border-b border-slate-50">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GENERAL</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {isLoading ? (
                            <div className="px-4 py-6 flex justify-center"><div className="w-6 h-6 border-2 border-[#1A4516] border-t-transparent rounded-full animate-spin" /></div>
                        ) : (
                            <SettingItem 
                                icon={Bell} 
                                label="Notifications" 
                                hasToggle 
                                activeToggle={notificationsEnabled}
                                onToggle={toggleNotifications}
                            />
                        )}
                    </div>
                </div>



                {/* Danger Zone */}
                <div className="pt-4 space-y-3">
                    <Button
                        onClick={promptDeleteAccount}
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 py-6 rounded-2xl font-bold flex items-center justify-center text-sm shadow-sm"
                    >
                        <LogOut size={20} className="mr-2" /> Delete Account
                    </Button>
                    <Button
                        onClick={promptLogout}
                        variant="outline"
                        className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 py-6 rounded-2xl font-bold flex items-center justify-center text-sm shadow-sm"
                    >
                        <LogOut size={20} className="mr-2" /> Logout
                    </Button>
                </div>

                <ConfirmDialog
                    isOpen={confirm.isOpen}
                    title={confirm.title}
                    message={confirm.message}
                    confirmLabel={confirm.confirmLabel}
                    cancelLabel={confirm.cancelLabel}
                    onConfirm={confirm.handleConfirm}
                    onCancel={confirm.close}
                    loading={confirm.loading}
                    variant={confirm.title === 'Delete Account' || confirm.title === 'Log out' ? 'danger' : 'primary'}
                />

            </div>
        </div>
    );
};

const SettingItem = ({ icon: Icon, label, value, hasToggle, activeToggle, onToggle }) => {
    return (
        <div 
            className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
            onClick={hasToggle ? onToggle : undefined}
        >
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#F5FBF5] flex items-center justify-center text-[#1A4516]">
                    <Icon size={16} />
                </div>
                <span className="font-semibold text-slate-800 text-sm">{label}</span>
            </div>

            <div className="flex items-center gap-2">
                {value && <span className="text-slate-400 text-xs font-medium">{value}</span>}
                {hasToggle ? (
                    <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors duration-300 ${activeToggle ? 'bg-[#1A4516]' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${activeToggle ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                ) : (
                    <ChevronRight size={20} className="text-slate-300" />
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
