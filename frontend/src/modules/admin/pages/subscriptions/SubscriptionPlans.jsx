import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, DataTable, StatusBadge, Modal, FormField, Input, ConfirmDialog } from '@shared/components/ui';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import adminApi from '@modules/admin/services/api';
import { toast } from 'sonner';

const SubscriptionPlans = () => {
    const [plans, setPlans] = useState([]);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [formData, setFormData] = useState({ name: '', monthlyPrice: '', yearlyPrice: '', orderLimit: '', billingTypes: ['MONTHLY', 'YEARLY'], features: [], status: 'ACTIVE' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPlans();
        fetchFeatures();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getPlans();
            setPlans(response.data?.result?.items || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeatures = async () => {
        try {
            const response = await adminApi.getFeatures({ status: 'ACTIVE' });
            setFeatures(response.data?.result?.items || []);
        } catch (error) {
            console.error('Failed to fetch features for dropdown');
        }
    };

    const handleOpenModal = (plan = null) => {
        if (plan) {
            setSelectedPlan(plan);
            setFormData({
                name: plan.name,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                orderLimit: plan.orderLimit === null ? '' : plan.orderLimit,
                billingTypes: plan.billingTypes || ['MONTHLY', 'YEARLY'],
                features: plan.features.map(f => f._id || f),
                status: plan.status,
            });
        } else {
            setSelectedPlan(null);
            setFormData({ name: '', monthlyPrice: '', yearlyPrice: '', orderLimit: '', billingTypes: ['MONTHLY', 'YEARLY'], features: [], status: 'ACTIVE' });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPlan(null);
    };

    const handleFeatureToggle = (featureId) => {
        setFormData(prev => {
            const isSelected = prev.features.includes(featureId);
            return {
                ...prev,
                features: isSelected ? prev.features.filter(id => id !== featureId) : [...prev.features, featureId]
            };
        });
    };

    const handleBillingToggle = (type) => {
        setFormData(prev => {
            const isSelected = prev.billingTypes.includes(type);
            return {
                ...prev,
                billingTypes: isSelected ? prev.billingTypes.filter(t => t !== type) : [...prev.billingTypes, type]
            };
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            
            // Prepare payload
            const payload = {
                ...formData,
                monthlyPrice: Number(formData.monthlyPrice),
                yearlyPrice: Number(formData.yearlyPrice),
                orderLimit: formData.orderLimit === '' ? null : Number(formData.orderLimit),
            };

            if (payload.billingTypes.length === 0) {
                toast.error("Please select at least one billing cycle");
                setSubmitting(false);
                return;
            }

            if (selectedPlan) {
                await adminApi.updatePlan(selectedPlan._id, payload);
                toast.success('Plan updated successfully');
            } else {
                await adminApi.createPlan(payload);
                toast.success('Plan created successfully');
            }
            handleCloseModal();
            fetchPlans();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await adminApi.togglePlanStatus(id);
            toast.success('Status updated successfully');
            fetchPlans();
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!selectedPlan) return;
        try {
            setSubmitting(true);
            await adminApi.deletePlan(selectedPlan._id);
            toast.success('Plan deleted successfully');
            setConfirmOpen(false);
            fetchPlans();
        } catch (error) {
            toast.error(error.message || 'Failed to delete plan. It may have active subscriptions.');
            setConfirmOpen(false);
        } finally {
            setSubmitting(false);
            setSelectedPlan(null);
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name', render: (val) => <span className="font-medium text-gray-900">{val}</span> },
        { header: 'Monthly Price', accessor: 'monthlyPrice', render: (val) => `₹${val}` },
        { header: 'Yearly Price', accessor: 'yearlyPrice', render: (val) => `₹${val}` },
        { 
            header: 'Order Limit', 
            accessor: 'orderLimit', 
            render: (val) => val === null ? <span className="text-gray-500">Unlimited</span> : val 
        },
        {
            header: 'Features',
            accessor: 'features',
            render: (val) => <span className="text-gray-600">{val?.length || 0} features</span>
        },
        {
            header: 'Active Subscribers',
            accessor: 'activeSubscribers',
            render: (val) => (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-800 bg-green-100 rounded-full">
                    {val || 0}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (value, row) => (
                <div onClick={() => handleToggleStatus(row._id)} className="cursor-pointer">
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
                        setSelectedPlan(row);
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
                    title="Subscription Plans"
                    description="Create and manage plans offered to sellers"
                />
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Plan
                </Button>
            </div>

            <Card>
                <DataTable
                    columns={columns}
                    data={plans}
                    loading={loading}
                    emptyMessage="No plans found. Add one to get started."
                />
            </Card>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={selectedPlan ? 'Edit Plan' : 'Add Plan'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Plan Name" required>
                        <Input
                            placeholder="e.g. Basic Plan"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </FormField>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Monthly Price (₹)" required>
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 999"
                                value={formData.monthlyPrice}
                                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                                required
                            />
                        </FormField>
                        <FormField label="Yearly Price (₹)" required>
                            <Input
                                type="number"
                                min="0"
                                placeholder="e.g. 9999"
                                value={formData.yearlyPrice}
                                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Order Limit (per cycle)">
                            <Input
                                type="number"
                                min="1"
                                placeholder="Leave empty for unlimited"
                                value={formData.orderLimit}
                                onChange={(e) => setFormData({ ...formData, orderLimit: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Billing Cycles Available">
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.billingTypes.includes('MONTHLY')}
                                        onChange={() => handleBillingToggle('MONTHLY')}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    Monthly
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.billingTypes.includes('YEARLY')}
                                        onChange={() => handleBillingToggle('YEARLY')}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    Yearly
                                </label>
                            </div>
                        </FormField>
                    </div>

                    <FormField label="Select Features">
                        <div className="grid grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto p-1">
                            {features.map(feature => {
                                const isSelected = formData.features.includes(feature._id);
                                return (
                                    <div 
                                        key={feature._id}
                                        onClick={() => handleFeatureToggle(feature._id)}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 border-primary-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className="mt-0.5">
                                            {isSelected ? (
                                                <CheckCircle2 className="w-5 h-5 text-primary-600" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                            )}
                                        </div>
                                        <div>
                                            <p className={`font-medium text-sm ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>{feature.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{feature.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {features.length === 0 && (
                                <p className="text-sm text-gray-500 col-span-2">No active features found. Please create some features first.</p>
                            )}
                        </div>
                    </FormField>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {selectedPlan ? 'Update Plan' : 'Create Plan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false);
                    setSelectedPlan(null);
                }}
                onConfirm={handleDelete}
                title="Delete Plan"
                message={`Are you sure you want to delete ${selectedPlan?.name}? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
                loading={submitting}
            />
        </div>
    );
};

export default SubscriptionPlans;
