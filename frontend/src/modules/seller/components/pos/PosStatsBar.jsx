import React, { useEffect, useState } from 'react';
import { HiOutlineUser, HiOutlineClock } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { posApi } from '../../services/posApi';

const PosStatsBar = ({ shopName }) => {
    const [stats, setStats] = useState({ today: { revenue: 0, count: 0 } });
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await posApi.getStats();
                if (res.data?.success) {
                    setStats(res.data.result);
                }
            } catch (error) {
                console.error('Failed to fetch POS stats', error);
            }
        };
        fetchStats();
        // Refresh stats every minute
        const statsTimer = setInterval(fetchStats, 60000);
        return () => clearInterval(statsTimer);
    }, []);

    return (
        <div className="h-14 bg-gray-900 text-white flex items-center justify-between px-3 md:px-6 shrink-0 z-10 shadow-md">
            <div className="flex items-center gap-3 md:gap-6">
                <Link to="/seller" className="text-xl font-bold flex items-center gap-1 md:gap-2 hover:text-blue-400 transition-colors">
                    <span className="text-xl md:text-2xl">🏪</span> 
                    <span className="truncate max-w-[120px] md:max-w-[200px] hidden sm:inline">{shopName || 'DM Groceries POS'}</span>
                </Link>
                <div className="h-6 w-px bg-gray-700 hidden sm:block"></div>
                <div className="flex items-center gap-2 md:gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-blue-300">
                        <span className="font-medium text-gray-400 uppercase tracking-wider text-xs hidden md:inline">Today's Sales:</span>
                        <span className="font-bold text-sm md:text-base">₹{(stats.today?.revenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-300 bg-gray-800 px-2 py-1 rounded-md hidden sm:flex">
                        <span>{stats.today?.count || 0} Bills</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3 md:gap-6">
                <div className="items-center gap-2 text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg text-sm hidden md:flex">
                    <HiOutlineClock size={16} className="text-gray-400" />
                    <span className="font-medium font-mono">{time.toLocaleTimeString()}</span>
                </div>
                
                <Link to="/seller/pos-history" className="text-xs md:text-sm font-medium hover:text-blue-400 transition-colors px-2 md:px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800">
                    <span className="hidden md:inline">POS </span>History
                </Link>
                
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border-2 border-gray-700 cursor-pointer hover:border-blue-500 transition-all">
                    <HiOutlineUser size={18} />
                </div>
            </div>
        </div>
    );
};

export default PosStatsBar;
