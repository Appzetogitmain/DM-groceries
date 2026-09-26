import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Button, DataTable, StatusBadge, Modal, FormField, Input, ConfirmDialog } from '@shared/components/ui';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import adminApi from '@modules/admin/services/api';
import { toast } from 'sonner';

const SubscriptionFeatures = () => {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '', status: 'ACTIVE' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getFeatures();
            setFeatures(response.data?.result?.items || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch features');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (feature = null) => {
        if (feature) {
            setSelectedFeature(feature);
            setFormData({
                name: feature.name,
                code: feature.code,
                description: feature.description || '',
                status: feature.status,
            });
        } else {
            setSelectedFeature(null);
            setFormData({ name: '', code: '', description: '', status: 'ACTIVE' });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedFeature(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            if (selectedFeature) {
                await adminApi.updateFeature(selectedFeature._id, formData);
                toast.success('Feature updated successfully');
            } else {
                await adminApi.createFeature(formData);
                toast.success('Feature created successfully');
            }
            handleCloseModal();
            fetchFeatures();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await adminApi.toggleFeatureStatus(id);
            toast.success('Status updated successfully');
            fetchFeatures();
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!selectedFeature) return;
        try {
            setSubmitting(true);
            await adminApi.deleteFeature(selectedFeature._id);
            toast.success('Feature deleted successfully');
            setConfirmOpen(false);
            fetchFeatures();
        } catch (error) {
            toast.error(error.message || 'Failed to delete feature. It may be used in active plans.');
            setConfirmOpen(false);
        } finally {
            setSubmitting(false);
            setSelectedFeature(null);
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name' },
        { header: 'Code', accessor: 'code' },
        { header: 'Description', accessor: 'description' },
        {
            header: 'Used In Plans',
            accessor: 'usedInPlans',
            render: (value) => (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-indigo-800 bg-indigo-100 rounded-full">
                    {value}
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
                        setSelectedFeature(row);
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
                    title="Plan Features"
                    description="Manage features available in subscription plans"
                />
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Feature
                </Button>
            </div>

            <Card>
                <DataTable
                    columns={columns}
                    data={features}
                    loading={loading}
                    emptyMessage="No features found. Add one to get started."
                />
            </Card>

            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={selectedFeature ? 'Edit Feature' : 'Add Feature'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Feature Name" required>
                        <Input
                            placeholder="e.g. Analytics Dashboard"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </FormField>
                    <FormField label="Feature Code (Unique)" required>
                        <Input
                            placeholder="e.g. ANALYTICS_DASHBOARD"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            disabled={!!selectedFeature}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">This code is used in code logic to check permissions.</p>
                    </FormField>
                    <FormField label="Description">
                        <textarea
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                            placeholder="Brief description of this feature"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </FormField>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            {selectedFeature ? 'Update Feature' : 'Create Feature'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false);
                    setSelectedFeature(null);
                }}
                onConfirm={handleDelete}
                title="Delete Feature"
                message={`Are you sure you want to delete ${selectedFeature?.name}? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
                icon={<ShieldAlert className="w-6 h-6 text-red-500" />}
                loading={submitting}
            />
        </div>
    );
};

export default SubscriptionFeatures;
