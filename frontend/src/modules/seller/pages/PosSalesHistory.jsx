import React, { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineDocumentDownload, HiOutlineEye } from 'react-icons/hi';
import { posApi } from '../services/posApi';
import { toast } from 'sonner';
import PosReceipt from '../components/pos/PosReceipt';
import { generatePosReceiptPdf } from '../components/pos/PosReceiptPdf';

const PosSalesHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Receipt Modal state
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (search) params.search = search;
            if (paymentMode) params.paymentMode = paymentMode;
            
            const res = await posApi.getOrders(params);
            if (res.data?.success) {
                setOrders(res.data.result.orders);
                setTotalPages(res.data.result.totalPages);
            }
        } catch (error) {
            toast.error('Failed to load POS history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchOrders, 300);
        return () => clearTimeout(timer);
    }, [page, search, paymentMode]);

    const downloadCsv = () => {
        if (orders.length === 0) return;
        
        const headers = ['Receipt #', 'Date', 'Customer', 'Phone', 'Payment Mode', 'Total Amount'];
        const csvContent = [
            headers.join(','),
            ...orders.map(o => [
                o.posMetadata?.receiptNumber || o.orderId,
                new Date(o.createdAt).toLocaleString(),
                `"${o.posMetadata?.walkInCustomerName || 'Walk-in'}"`,
                o.posMetadata?.walkInCustomerPhone || '',
                o.paymentMode,
                o.paymentBreakdown?.grandTotal || 0
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `POS_History_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">POS Sales History</h1>
                    <p className="text-gray-500">View and manage walk-in counter sales</p>
                </div>
                <button
                    onClick={downloadCsv}
                    disabled={orders.length === 0}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                    <HiOutlineDocumentDownload size={20} />
                    Export CSV
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50">
                    <div className="relative flex-1">
                        <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by receipt # or phone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                    >
                        <option value="">All Payment Modes</option>
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online/UPI</option>
                        <option value="MIXED">Mixed</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Receipt Info</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                            Loading history...
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No POS orders found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{order.posMetadata?.receiptNumber || order.orderId}</div>
                                            <div className="text-gray-500 text-xs">{new Date(order.createdAt).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900">{order.posMetadata?.walkInCustomerName || 'Walk-in'}</div>
                                            <div className="text-gray-500 text-xs">{order.posMetadata?.walkInCustomerPhone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-700">
                                            {order.items?.length || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${order.paymentMode === 'CASH' ? 'bg-green-100 text-green-800' : ''}
                                                ${order.paymentMode === 'ONLINE' ? 'bg-blue-100 text-blue-800' : ''}
                                                ${order.paymentMode === 'MIXED' ? 'bg-purple-100 text-purple-800' : ''}
                                            `}>
                                                {order.paymentMode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ₹{order.paymentBreakdown?.grandTotal?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View Receipt"
                                                >
                                                    <HiOutlineEye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => generatePosReceiptPdf(order)}
                                                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                                    title="Download PDF"
                                                >
                                                    <HiOutlineDocumentDownload size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {selectedOrder && (
                <PosReceipt 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                />
            )}
        </div>
    );
};

export default PosSalesHistory;
