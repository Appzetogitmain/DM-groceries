import React, { useState, useEffect } from 'react';
import { Bell, Lock, User, Globe, ChevronRight, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { useAuth } from '@core/context/AuthContext';
import { toast } from 'sonner';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
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
                <div className="pt-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to log out?")) {
                                logout();
                            }
                        }}
                        className="w-full py-3.5 text-red-600 font-bold bg-red-50 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors text-sm"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>

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
