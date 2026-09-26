import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, DataTable, StatusBadge, Modal, FormField, Input, ConfirmDialog } from '@shared/components/ui';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import adminApi from '@modules/admin/services/api';
import { toast } from 'sonner';

const SubscriptionOffers = () => {
    const [offers, setOffers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    
    // YYYY-MM-DD for date inputs
    const getTodayStr = () => new Date().toISOString().split('T')[0];
    const getNextWeekStr = () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({ 
        name: '', 
        offerType: 'PLAN_DISCOUNT', 
        plan: '', 
        discountType: 'FLAT', 
        discountValue: '', 
        startDate: getTodayStr(), 
        endDate: getNextWeekStr(), 
        description: '', 
        status: '' 
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOffers();
        fetchPlans();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getOffers();
            setOffers(response.data?.result?.items || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch offers');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await adminApi.getPlans({ status: 'ACTIVE' });
            setPlans(response.data?.result?.items || []);
        } catch (error) {
            console.error('Failed to fetch plans for dropdown');
        }
    };

    const handleOpenModal = (offer = null) => {
        if (offer) {
            setSelectedOffer(offer);
            setFormData({
                name: offer.name,
                offerType: offer.offerType,
                plan: offer.plan?._id || '',
                discountType: offer.discountType,
                discountValue: offer.discountValue,
                startDate: new Date(offer.startDate).toISOString().split('T')[0],
                endDate: new Date(offer.endDate).toISOString().split('T')[0],
                description: offer.description || '',
                status: offer.status,
            });
        } else {
            setSelectedOffer(null);
            setFormData({ 
                name: '', 
                offerType: 'PLAN_DISCOUNT', 
                plan: plans.length > 0 ? plans[0]._id : '', 
                discountType: 'FLAT', 
                discountValue: '', 
                startDate: getTodayStr(), 
                endDate: getNextWeekStr(), 
                description: '', 
                status: '' 
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedOffer(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                ...formData,
                discountValue: Number(formData.discountValue),
            };

            if (selectedOffer) {
                await adminApi.updateOffer(selectedOffer._id, payload);
                toast.success('Offer updated successfully');
            } else {
                await adminApi.createOffer(payload);
                toast.success('Offer created successfully');
            }
            handleCloseModal();
            fetchOffers();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await adminApi.toggleOfferStatus(id);
            toast.success('Status updated successfully');
            fetchOffers();
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!selectedOffer) return;
        try {
            setSubmitting(true);
            await adminApi.deleteOffer(selectedOffer._id);
            toast.success('Offer deleted successfully');
            setConfirmOpen(false);
            fetchOffers();
        } catch (error) {
            toast.error(error.message || 'Failed to delete offer');
            setConfirmOpen(false);
        } finally {
            setSubmitting(false);
            setSelectedOffer(null);
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name', render: (val) => <span className="font-medium text-gray-900">{val}</span> },
        { header: 'Plan', accessor: 'plan', render: (val) => val?.name || 'Unknown Plan' },
        { 
            header: 'Discount', 
            render: (_, row) => (
                <span className="font-semibold text-green-600">
                    {row.discountType === 'PERCENTAGE' ? `${row.discountValue}% OFF` : `₹${row.discountValue} OFF`}
                </span>
            )
        },
        { 
            header: 'Duration', 
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
            render: (value, row) => (
                <div onClick={() => handleToggleStatus(row._id)} className={`cursor-pointer ${value === 'EXPIRED' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                    <StatusBadge status={value} />
                </div>
            )
        },
        {
            header: 'Actions',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedOffer(row);
                        setConfirmOpen(true);
                    }}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Offers & Discounts"
                    description="Create promotional offers for subscription plans"
                />
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Offer
                </Button>
            </div>

            <Card>
                <DataTable
                    columns={columns}
                    data={offers}
                    loading={loading}
                    emptyMessage="No offers found. Add one to get started."
                />
            </Card>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={selectedOffer ? 'Edit Offer' : 'Create Offer'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Offer Name" required>
                        <Input
                            placeholder="e.g. Diwali Special"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </FormField>
                    
                    <FormField label="Target Plan" required>
                        <select
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            value={formData.plan}
                            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                            required
                        >
                            <option value="" disabled>Select a plan</option>
                            {plans.map(p => (
                                <option key={p._id} value={p._id}>{p.name} (₹{p.monthlyPrice}/mo)</option>
                            ))}
                        </select>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Discount Type" required>
                            <select
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                required
                            >
                                <option value="FLAT">Flat Amount (₹)</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                            </select>
                        </FormField>
                        <FormField label={formData.discountType === 'PERCENTAGE' ? "Discount Percentage (%)" : "Discount Amount (₹)"} required>
                            <Input
                                type="number"
                                min="1"
                                max={formData.discountType === 'PERCENTAGE' ? "100" : undefined}
                                placeholder={formData.discountType === 'PERCENTAGE' ? "e.g. 20" : "e.g. 500"}
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date" required>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </FormField>
                        <FormField label="End Date" required>
                            <Input
                                type="date"
                                value={formData.endDate}
                                min={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <FormField label="Description">
                        <textarea
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={2}
                            placeholder="Brief description for internal reference"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </FormField>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {selectedOffer ? 'Update Offer' : 'Create Offer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false);
                    setSelectedOffer(null);
                }}
                onConfirm={handleDelete}
                title="Delete Offer"
                message={`Are you sure you want to delete ${selectedOffer?.name}? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
                loading={submitting}
            />
        </div>
    );
};

export default SubscriptionOffers;
