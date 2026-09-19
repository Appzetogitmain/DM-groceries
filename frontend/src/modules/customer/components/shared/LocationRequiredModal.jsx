import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import LocationDrawer from './LocationDrawer';

const LocationRequiredModal = () => {
    const { hasSetLocation, refreshLocation } = useLocation();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (hasSetLocation) return null;

    const handleEnableLocation = async () => {
        setIsLoading(true);
        const res = await refreshLocation();
        setIsLoading(false);
        // If native permission was denied or it failed, open manual search drawer
        if (!res.ok) {
            setIsDrawerOpen(true);
        }
    };

    return (
        <AnimatePresence>
            {!hasSetLocation && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center pb-8 sm:pb-6"
                    >
                        <div className="w-16 h-16 bg-[#F5FBF5] text-[#1A4516] rounded-full flex items-center justify-center mb-4 shadow-sm border border-[#1A4516]/10">
                            <MapPin size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Location Required</h2>
                        <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
                            Please provide your delivery location to see products and offers available in your area.
                        </p>
                        
                        <div className="w-full space-y-3">
                            <button 
                                onClick={handleEnableLocation}
                                disabled={isLoading}
                                className="w-full bg-[#1A4516] text-white font-bold py-3.5 rounded-xl hover:bg-[#11300F] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <MapPin size={18} /> Enable Current Location
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={() => setIsDrawerOpen(true)}
                                disabled={isLoading}
                                className="w-full bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                <Search size={18} /> Search Manually
                            </button>
                        </div>
                    </motion.div>

                    <LocationDrawer 
                        isOpen={isDrawerOpen} 
                        onClose={() => {
                            setIsDrawerOpen(false);
                        }} 
                    />
                </div>
            )}
        </AnimatePresence>
    );
};

export default LocationRequiredModal;
