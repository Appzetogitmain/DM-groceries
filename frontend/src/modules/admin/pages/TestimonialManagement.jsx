import React, { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';
import { cn } from '@/lib/utils';
import { Check, X, Trash2, Edit3, Plus, Star, Loader2, Search, MessageSquareQuote } from 'lucide-react';

const TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' }
];

const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'error' };
const EMPTY_FORM = { name: '', city: '', rating: 5, message: '', status: 'approved', displayOrder: 0 };

const StarRow = ({ value, onChange, size = 16 }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
            <Star
                key={n}
                size={size}
                onClick={onChange ? () => onChange(n) : undefined}
                className={cn(
                    n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
                    onChange && 'cursor-pointer'
                )}
            />
        ))}
    </div>
);

const TestimonialManagement = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('pending');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchItems = useCallback(async (requestedPage = 1) => {
        try {
            setLoading(true);
            const res = await adminApi.getTestimonials({
                page: requestedPage,
                limit: pageSize,
                status: tab || undefined,
                search: search.trim() || undefined
            });
            const payload = res.data?.result || {};
            setItems(Array.isArray(payload.items) ? payload.items : []);
            setStats(payload.stats || { pending: 0, approved: 0, rejected: 0 });
            setTotal(payload.total || 0);
            setPage(payload.page || requestedPage);
        } catch (error) {
            showToast('Failed to load testimonials', 'error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, search, pageSize]);

    useEffect(() => {
        const t = setTimeout(() => fetchItems(1), 250);
        return () => clearTimeout(t);
    }, [fetchItems]);

    const setStatus = async (item, status) => {
        try {
            await adminApi.updateTestimonial(item._id, { status });
            showToast(status === 'approved' ? 'Testimonial approved and live on the landing page' : `Testimonial ${status}`, 'success');
            fetchItems(page);
        } catch (error) {
            showToast(error.response?.data?.message || 'Update failed', 'error');
        }
    };

    const remove = async (item) => {
        if (!window.confirm(`Delete testimonial from ${item.name}?`)) return;
        try {
            await adminApi.deleteTestimonial(item._id);
            showToast('Testimonial deleted', 'success');
            fetchItems(page);
        } catch (error) {
            showToast(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (item) => {
        setEditingId(item._id);
        setForm({
            name: item.name,
            city: item.city || '',
            rating: item.rating || 5,
            message: item.message,
            status: item.status,
            displayOrder: item.displayOrder || 0
        });
        setModalOpen(true);
    };

    const save = async () => {
        if (!form.name.trim() || !form.message.trim()) {
            showToast('Name and message are required', 'error');
            return;
        }
        try {
            setSaving(true);
            if (editingId) await adminApi.updateTestimonial(editingId, form);
            else await adminApi.createTestimonial(form);
            showToast(editingId ? 'Testimonial updated' : 'Testimonial created', 'success');
            setModalOpen(false);
            fetchItems(editingId ? page : 1);
        } catch (error) {
            showToast(error.response?.data?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquareQuote className="text-green-700" /> Testimonials
                    </h1>
                    <p className="text-sm text-gray-500">
                        Approve customer testimonials to show them in &quot;What Our Customers Say&quot; on the landing page.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
                >
                    <Plus size={16} /> Add Testimonial
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {TABS.map((t) => (
                        <button
                            key={t.label}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                                tab === t.key ? 'bg-white shadow text-green-800' : 'text-gray-500 hover:text-gray-800'
                            )}
                        >
                            {t.label}
                            {t.key && <span className="ml-1.5 text-xs opacity-70">{stats[t.key] ?? 0}</span>}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, city or message"
                        className={cn(inputCls, 'pl-9')}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-700" /></div>
            ) : items.length === 0 ? (
                <Card className="p-10 text-center text-gray-500">No testimonials found.</Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                        <Card key={item._id} className="p-5 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 shrink-0 rounded-full bg-green-100 text-green-800 font-bold flex items-center justify-center">
                                        {item.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {item.city || '—'} · {item.source === 'admin' ? 'Added by admin' : 'Submitted by user'}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={STATUS_COLOR[item.status]}>{item.status}</Badge>
                            </div>
                            <StarRow value={item.rating} />
                            <p className="text-sm text-gray-600 flex-1 whitespace-pre-line">{item.message}</p>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                {item.status !== 'approved' && (
                                    <button
                                        onClick={() => setStatus(item, 'approved')}
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800"
                                    >
                                        <Check size={14} /> Approve
                                    </button>
                                )}
                                {item.status !== 'rejected' && (
                                    <button
                                        onClick={() => setStatus(item, 'rejected')}
                                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    >
                                        <X size={14} /> Reject
                                    </button>
                                )}
                                <div className="ml-auto flex gap-1">
                                    <button onClick={() => openEdit(item)} aria-label="Edit" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => remove(item)} aria-label="Delete" className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Pagination
                page={page}
                totalPages={Math.ceil(total / pageSize) || 1}
                total={total}
                pageSize={pageSize}
                onPageChange={(p) => fetchItems(p)}
                onPageSizeChange={(s) => setPageSize(s)}
            />

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingId ? 'Edit Testimonial' : 'Add Testimonial'}
                footer={
                    <>
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
                            Cancel
                        </button>
                        <button
                            onClick={save}
                            disabled={saving}
                            className="px-5 py-2 rounded-xl text-sm font-semibold bg-green-700 hover:bg-green-800 text-white disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium text-gray-700">
                            Name *
                            <input className={cn(inputCls, 'mt-1')} value={form.name} maxLength={80}
                                onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </label>
                        <label className="text-sm font-medium text-gray-700">
                            City
                            <input className={cn(inputCls, 'mt-1')} value={form.city} maxLength={80}
                                onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        </label>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Rating</p>
                        <StarRow value={form.rating} size={24} onChange={(n) => setForm({ ...form, rating: n })} />
                    </div>
                    <label className="block text-sm font-medium text-gray-700">
                        Message *
                        <textarea className={cn(inputCls, 'mt-1')} rows={4} maxLength={500} value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium text-gray-700">
                            Status
                            <select className={cn(inputCls, 'mt-1')} value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="approved">Approved (visible)</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </label>
                        <label className="text-sm font-medium text-gray-700">
                            Display order
                            <input type="number" className={cn(inputCls, 'mt-1')} value={form.displayOrder}
                                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} />
                            <span className="text-xs text-gray-400">Lower numbers show first</span>
                        </label>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TestimonialManagement;
