import React, { useState } from 'react';
import { HiOutlineUser, HiOutlinePhone, HiCheck, HiX } from 'react-icons/hi';
import { posApi } from '../../services/posApi';
import { toast } from 'sonner';

const PosCustomerLookup = ({ customer, setCustomer }) => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(true);

    const handleLookup = async (e) => {
        e.preventDefault();
        
        // Basic Indian phone validation
        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            toast.error('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            const res = await posApi.lookupCustomer({ phone: cleanedPhone });
            if (res.data?.success) {
                setCustomer(res.data.result);
                setIsEditing(false);
                toast.success('Customer found');
            }
        } catch (error) {
            // Not found, so we treat as new customer (which the backend actually creates)
            toast.info('New customer will be created');
            setCustomer({ phone: cleanedPhone, name: 'Walk-in Customer' });
            setIsEditing(false);
        } finally {
            setLoading(false);
        }
    };

    const clearCustomer = () => {
        setCustomer(null);
        setPhone('');
        setIsEditing(true);
    };

    if (customer && !isEditing) {
        return (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <HiOutlineUser size={20} />
                    </div>
                    <div>
                        <div className="font-medium text-blue-900">{customer.name || 'Walk-in Customer'}</div>
                        <div className="text-sm text-blue-700">{customer.phone}</div>
                    </div>
                </div>
                <button 
                    onClick={clearCustomer}
                    className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                >
                    <HiX size={20} />
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
                <HiOutlinePhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="tel"
                    placeholder="Customer phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    autoFocus={!customer}
                />
            </div>
            <button
                type="submit"
                disabled={loading || !phone}
                className="px-4 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center gap-2"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <HiCheck size={18} />
                )}
                <span>Select</span>
            </button>
        </form>
    );
};

export default PosCustomerLookup;
