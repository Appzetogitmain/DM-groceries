import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, DataTable, StatusBadge, Modal } from '@shared/components/ui';
import { Eye, Store, Calendar, CreditCard, Tag } from 'lucide-react';
import adminApi from '@modules/admin/services/api';
import { toast } from 'sonner';

const SubscribersList = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);

    useEffect(() => {
        fetchSubscribers();
        fetchStats();
    }, []);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getSubscribers();
            setSubscribers(response.data?.result?.items || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch subscribers');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminApi.getSubscriptionStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch subscriber stats');
        }
    };

    const handleViewDetails = async (id) => {
        try {
            const res = await adminApi.getSubscriberById(id);
            setSelectedSub(res.data);
            setModalOpen(true);
        } catch (error) {
            toast.error(error.message || "Failed to load details");
        }
    };

    const columns = [
        { 
            header: 'Seller', 
            render: (_, row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.seller?.shopName || 'Unknown Shop'}</p>
                    <p className="text-xs text-gray-500">{row.seller?.name}</p>
                </div>
            ) 
        },
        { 
            header: 'Plan', 
            render: (_, row) => (
                <div>
                    <p className="font-medium text-primary-700">{row.plan?.name || row.planSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{row.billingCycle}</p>
                </div>
            ) 
        },
        { 
            header: 'Revenue', 
            render: (_, row) => (
                <span className="font-medium">₹{row.finalAmount}</span>
            )
        },
        { 
            header: 'Validity', 
            render: (_, row) => (
                <div className="text-sm">
                    <p>{new Date(row.startDate).toLocaleDateString()}</p>
                    <p className="text-gray-500">to {new Date(row.endDate).toLocaleDateString()}</p>
                </div>
            ) 
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            header: 'Actions',
            render: (_, row) => (
                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(row._id)}>
                    <Eye className="w-4 h-4 text-gray-600" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Subscribers"
                description="View active and historical subscriptions across all sellers"
            />

            {stats && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                                <CreditCard className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                                    <dd className="text-xl font-bold text-gray-900">₹{stats.totalRevenue?.toLocaleString() || 0}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                                <Store className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Subscribers</dt>
                                    <dd className="text-xl font-bold text-gray-900">{stats.totalActive || 0}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                                <Calendar className="h-6 w-6 text-gray-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Expired Subscriptions</dt>
                                    <dd className="text-xl font-bold text-gray-900">{stats.totalExpired || 0}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                                <Tag className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Discounts Given</dt>
                                    <dd className="text-xl font-bold text-gray-900">₹{stats.totalDiscount?.toLocaleString() || 0}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <DataTable
                    columns={columns}
                    data={subscribers}
                    loading={loading}
                    emptyMessage="No subscribers found."
                />
            </Card>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Subscription Details"
                size="xl"
            >
                {selectedSub && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedSub.seller?.shopName}</h3>
                                <p className="text-sm text-gray-500">{selectedSub.seller?.name} • {selectedSub.seller?.phone}</p>
                            </div>
                            <StatusBadge status={selectedSub.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Plan Details</h4>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="text-gray-500">Plan Name</dt><dd className="font-medium text-gray-900">{selectedSub.planSnapshot?.name || selectedSub.plan?.name}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Billing Cycle</dt><dd className="font-medium text-gray-900">{selectedSub.billingCycle}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Valid From</dt><dd className="font-medium text-gray-900">{new Date(selectedSub.startDate).toLocaleDateString()}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Valid To</dt><dd className="font-medium text-gray-900">{new Date(selectedSub.endDate).toLocaleDateString()}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Order Limit</dt><dd className="font-medium text-gray-900">{selectedSub.orderLimit === null ? 'Unlimited' : `${selectedSub.ordersUsed} / ${selectedSub.orderLimit}`}</dd></div>
                                </dl>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Payment Details</h4>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="text-gray-500">Original Amount</dt><dd className="font-medium text-gray-900">₹{selectedSub.amount}</dd></div>
                                    {selectedSub.offer && (
                                        <div className="flex justify-between"><dt className="text-gray-500">Offer Applied</dt><dd className="font-medium text-primary-600">{selectedSub.offer?.name}</dd></div>
                                    )}
                                    <div className="flex justify-between"><dt className="text-gray-500">Discount</dt><dd className="font-medium text-green-600">-₹{selectedSub.discountAmount}</dd></div>
                                    <div className="flex justify-between pt-2 border-t border-gray-200 mt-2"><dt className="font-bold text-gray-900">Final Paid</dt><dd className="font-bold text-gray-900">₹{selectedSub.finalAmount}</dd></div>
                                </dl>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Snapshot Features</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedSub.planSnapshot?.features?.map((code, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SubscribersList;
