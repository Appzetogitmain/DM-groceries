import React from 'react';
import { HiOutlineCash, HiOutlineDeviceMobile } from 'react-icons/hi';

const PosPaymentPanel = ({ 
    total, 
    paymentMode, 
    setPaymentMode, 
    cashReceived, 
    setCashReceived, 
    onlineAmountPaid,
    setOnlineAmountPaid
}) => {
    
    // Auto-calculate remaining amount if MIXED
    const remainingForOnline = Math.max(0, total - (cashReceived || 0));
    
    // Helper to calculate change
    const calculateChange = () => {
        if (paymentMode === 'CASH') {
            return Math.max(0, (cashReceived || 0) - total);
        }
        if (paymentMode === 'MIXED') {
            return Math.max(0, (cashReceived || 0) + (onlineAmountPaid || 0) - total);
        }
        return 0;
    };

    const change = calculateChange();

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 mt-4 space-y-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">Payment Details</h3>
            
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => setPaymentMode('CASH')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        paymentMode === 'CASH' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                    <HiOutlineCash size={24} className="mb-1" />
                    <span className="text-sm font-medium">Cash</span>
                </button>
                <button
                    onClick={() => setPaymentMode('ONLINE')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        paymentMode === 'ONLINE' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                    <HiOutlineDeviceMobile size={24} className="mb-1" />
                    <span className="text-sm font-medium">Online/UPI</span>
                </button>
                <button
                    onClick={() => setPaymentMode('MIXED')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        paymentMode === 'MIXED' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                >
                    <div className="flex mb-1">
                        <HiOutlineCash size={20} className="-mr-1" />
                        <HiOutlineDeviceMobile size={20} />
                    </div>
                    <span className="text-sm font-medium">Mixed</span>
                </button>
            </div>

            {/* Inputs based on payment mode */}
            {(paymentMode === 'CASH' || paymentMode === 'MIXED') && (
                <div className="space-y-3 pt-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Cash Received (₹)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                            value={cashReceived || ''}
                            onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                            placeholder={total.toString()}
                        />
                    </div>
                    
                    {/* Quick cash buttons */}
                    <div className="flex gap-2">
                        {[500, 1000, 2000, total].map((val, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCashReceived(val)}
                                className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
                            >
                                ₹{val}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {paymentMode === 'MIXED' && (
                <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                        Online Payment (₹)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                        value={onlineAmountPaid || remainingForOnline}
                        onChange={(e) => setOnlineAmountPaid(parseFloat(e.target.value) || 0)}
                    />
                </div>
            )}

            {/* Change Display */}
            {(paymentMode === 'CASH' || paymentMode === 'MIXED') && (
                <div className={`mt-4 p-3 rounded-lg flex items-center justify-between ${
                    change > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}>
                    <span className="font-medium text-gray-700">Change to return:</span>
                    <span className={`text-xl font-bold ${change > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        ₹{change.toFixed(2)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default PosPaymentPanel;
