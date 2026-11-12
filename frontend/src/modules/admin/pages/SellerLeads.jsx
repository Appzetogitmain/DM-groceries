import React, { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import StatCard from '@shared/components/ui/StatCard';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import ConfirmDialog from '@shared/components/ui/ConfirmDialog';
import { useToast } from '@shared/components/ui/Toast';
import { adminUsersApi } from '../services/api/usersApi';
import { cn } from '@/lib/utils';
import {
    Store,
    Search,
    Phone,
    MapPin,
    Tag,
    Edit3,
    Trash2,
    Loader2,
    MessageCircle,
    User,
    Inbox,
    Clock,
    PhoneCall,
    CheckCircle2,
    XCircle
} from 'lucide-react';

const TABS = [
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'onboarded', label: 'Onboarded' },
    { key: 'rejected', label: 'Rejected' },
    { key: '', label: 'All' }
];

const STATUS_BADGE = {
    new: 'warning',
    contacted: 'info',
    onboarded: 'success',
    rejected: 'error'
};

const STATUS_LABEL = {
    new: 'New',
    contacted: 'Contacted',
    onboarded: 'Onboarded',
    rejected: 'Rejected'
};

const BRIEFING_ITEMS = [
    { key: 'howOrdersCome', label: 'What DM Groceries is and how orders come' },
    { key: 'commission', label: 'Commission explained' },
    { key: 'payoutTiming', label: 'Payout timing explained' },
    { key: 'driversDeliver', label: 'Our drivers deliver, seller only packs' },
    { key: 'repeatDemand', label: 'My List demand: orders repeat every month' },
    { key: 'documentsNeeded', label: 'Documents needed: Trade licence, GST, PAN, Aadhar' }
];

const EMPTY_CHECKLIST = {
    howOrdersCome: false,
    commission: false,
    payoutTiming: false,
    driversDeliver: false,
    repeatDemand: false,
    documentsNeeded: false
};

const formatDate = (value) => {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
};

const SellerLeads = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('new');
    const [requestTypeFilter, setRequestTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ new: 0, contacted: 0, onboarded: 0, rejected: 0, all: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Edit notes / status / briefing checklist modal
    const [editingLead, setEditingLead] = useState(null);
    const [editForm, setEditForm] = useState({
        status: 'new',
        adminNotes: '',
        nextFollowUp: '',
        briefingChecklist: { ...EMPTY_CHECKLIST }
    });
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchLeads = useCallback(async (requestedPage = 1) => {
        try {
            setLoading(true);
            const res = await adminUsersApi.getSellerLeads({
                page: requestedPage,
                limit: pageSize,
                status: tab || undefined,
                requestType: requestTypeFilter || undefined,
                search: search.trim() || undefined
            });
            const payload = res.data?.result || {};
            setItems(Array.isArray(payload.items) ? payload.items : []);
            setStats(payload.stats || { new: 0, contacted: 0, onboarded: 0, rejected: 0, all: 0 });
            setTotal(payload.total || 0);
            setTotalPages(payload.totalPages || 1);
            setPage(payload.page || requestedPage);
        } catch {
            showToast('Failed to load seller leads', 'error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, requestTypeFilter, search, pageSize]);

    useEffect(() => {
        const timer = setTimeout(() => fetchLeads(1), 250);
        return () => clearTimeout(timer);
    }, [fetchLeads]);

    const handleQuickStatusChange = async (lead, nextStatus) => {
        try {
            await adminUsersApi.updateSellerLead(lead._id, { status: nextStatus });
            showToast(`Marked as ${STATUS_LABEL[nextStatus] || nextStatus}`, 'success');
            window.dispatchEvent(new Event('admin:pending-counts-changed'));
            fetchLeads(page);
        } catch (err) {
            showToast(err.response?.data?.message || 'Could not update status', 'error');
        }
    };

    const openEditModal = (lead) => {
        setEditingLead(lead);
        setEditForm({
            status: lead.status || 'new',
            adminNotes: lead.adminNotes || '',
            nextFollowUp: lead.nextFollowUp || '',
            briefingChecklist: {
                ...EMPTY_CHECKLIST,
                ...(lead.briefingChecklist || {})
            }
        });
    };

    const handleSaveModal = async () => {
        if (!editingLead) return;
        try {
            setSaving(true);
            await adminUsersApi.updateSellerLead(editingLead._id, editForm);
            showToast('Seller lead updated', 'success');
            setEditingLead(null);
            window.dispatchEvent(new Event('admin:pending-counts-changed'));
            fetchLeads(page);
        } catch (err) {
            showToast(err.response?.data?.message || 'Could not save changes', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await adminUsersApi.deleteSellerLead(deleteTarget._id);
            showToast('Seller lead deleted', 'success');
            setDeleteTarget(null);
            window.dispatchEvent(new Event('admin:pending-counts-changed'));
            fetchLeads(page);
        } catch (err) {
            showToast(err.response?.data?.message || 'Could not delete lead', 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Store className="h-6 w-6 text-emerald-700" />
                        Seller Leads
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Seller registration requests submitted from the landing page &ldquo;Sell with us&rdquo; form.
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { key: '', label: 'Total Leads', value: stats.all ?? 0, icon: Inbox, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { key: 'new', label: 'New Requests', value: stats.new ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { key: 'contacted', label: 'Contacted', value: stats.contacted ?? 0, icon: PhoneCall, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { key: 'onboarded', label: 'Onboarded', value: stats.onboarded ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                    { key: 'rejected', label: 'Rejected', value: stats.rejected ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
                ].map((kpi) => (
                    <StatCard
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.value}
                        icon={kpi.icon}
                        color={kpi.color}
                        bg={kpi.bg}
                        onClick={() => setTab(kpi.key)}
                        className={tab === kpi.key ? 'ring-2 ring-emerald-600/30' : ''}
                    />
                ))}
            </div>

            {/* Filter Tabs & Search */}
            <Card className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {TABS.map((t) => {
                            const count = t.key ? stats[t.key] ?? 0 : stats.all ?? 0;
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key || 'all'}
                                    type="button"
                                    onClick={() => setTab(t.key)}
                                    className={cn(
                                        'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                                        active
                                            ? 'bg-emerald-700 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    )}
                                >
                                    <span>{t.label}</span>
                                    <span
                                        className={cn(
                                            'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                                            active ? 'bg-white/20 text-white' : 'bg-white text-gray-700'
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
                        <select
                            value={requestTypeFilter}
                            onChange={(e) => setRequestTypeFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                        >
                            <option value="">All Requests</option>
                            <option value="register">Register now</option>
                            <option value="info">Wants more info</option>
                        </select>
                        <div className="relative w-full sm:w-64 lg:w-72">
                            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search shop, owner, phone, area..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="py-16 flex items-center justify-center text-gray-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                        <span className="text-sm font-medium">Loading seller leads...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <Store className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-gray-700">No seller leads found</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Requests submitted from the landing page &ldquo;Register now&rdquo; form will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                    <th className="px-4 py-3">Shop Name</th>
                                    <th className="px-4 py-3">Owner &amp; Phone</th>
                                    <th className="px-4 py-3">Area</th>
                                    <th className="px-4 py-3">What They Sell</th>
                                    <th className="px-4 py-3">Submitted</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {items.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-3.5 align-top">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-gray-900">
                                                    {lead.shopName || lead.ownerName}
                                                </span>
                                                <Badge variant={lead.requestType === 'info' ? 'info' : 'success'}>
                                                    {lead.requestType === 'info' ? 'Wants more info' : 'Register now'}
                                                </Badge>
                                            </div>
                                            {lead.question && (
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-xs">
                                                    Q: {lead.question}
                                                </p>
                                            )}
                                            {lead.adminNotes && (
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xs">
                                                    Note: {lead.adminNotes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 align-top">
                                            <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{lead.ownerName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <a
                                                    href={`tel:+91${lead.phone}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    {lead.phone}
                                                </a>
                                                <a
                                                    href={`https://wa.me/91${lead.phone}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Chat on WhatsApp"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline"
                                                >
                                                    <MessageCircle className="h-3 w-3" />
                                                    WhatsApp
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 align-top text-gray-700">
                                            {lead.area ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                    {lead.area}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 align-top text-gray-700 max-w-[200px]">
                                            {lead.categories ? (
                                                <span className="inline-flex items-start gap-1">
                                                    <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                                                    <span>{lead.categories}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Not specified</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 align-top text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(lead.createdAt)}
                                        </td>
                                        <td className="px-4 py-3.5 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant={STATUS_BADGE[lead.status] || 'default'}>
                                                    {STATUS_LABEL[lead.status] || lead.status}
                                                </Badge>
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleQuickStatusChange(lead, e.target.value)}
                                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                                >
                                                    {lead.status === 'new' && <option value="new">New</option>}
                                                    {lead.status !== 'onboarded' && <option value="contacted">Contacted</option>}
                                                    <option value="onboarded">Onboarded</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(lead)}
                                                    title="Edit notes & status"
                                                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-emerald-700 transition-colors"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(lead)}
                                                    title="Delete lead"
                                                    className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > 0 && (
                    <div className="border-t border-gray-100 p-4">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            pageSize={pageSize}
                            loading={loading}
                            onPageChange={(nextPage) => fetchLeads(nextPage)}
                            onPageSizeChange={(nextSize) => {
                                setPageSize(nextSize);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </Card>

            {/* Edit Modal */}
            <Modal
                isOpen={Boolean(editingLead)}
                onClose={() => setEditingLead(null)}
                title={editingLead ? `Follow up: ${editingLead.shopName || editingLead.ownerName}` : 'Follow up'}
            >
                {editingLead && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-gray-50 p-4 text-xs space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Contact
                            </p>
                            <div className="grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-3">
                                <span className="text-gray-500">Shop</span>
                                <span className="font-semibold text-gray-900">
                                    {editingLead.shopName
                                        ? `${editingLead.shopName}${editingLead.area ? `, ${editingLead.area}` : ''}`
                                        : 'Not specified'}
                                </span>

                                <span className="text-gray-500">Owner</span>
                                <span className="font-semibold text-gray-900">{editingLead.ownerName}</span>

                                <span className="text-gray-500">Phone</span>
                                <span className="font-semibold text-gray-900">{editingLead.phone}</span>

                                <span className="text-gray-500">Form filled</span>
                                <span className="font-semibold text-gray-900">
                                    {formatDate(editingLead.createdAt)}
                                </span>

                                <span className="text-gray-500">Request</span>
                                <span className="font-semibold text-gray-900">
                                    {editingLead.requestType === 'info' ? 'Wants more info' : 'Registered (full form)'}
                                </span>

                                {(editingLead.requestType === 'info' || editingLead.question) && (
                                    <>
                                        <span className="text-gray-500">Question</span>
                                        <span className="font-semibold text-gray-900">
                                            {editingLead.question || 'No question written'}
                                        </span>
                                    </>
                                )}

                                <span className="text-gray-500">Categories</span>
                                <span className="font-semibold text-gray-900">
                                    {editingLead.categories || 'Not specified'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Contact Buttons */}
                        <div className="flex flex-wrap gap-2.5">
                            <a
                                href={`tel:+91${editingLead.phone}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-700/30 text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-colors"
                            >
                                <Phone className="h-3.5 w-3.5" />
                                Call now
                            </a>
                            <a
                                href={`https://wa.me/91${editingLead.phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-700/30 text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-colors"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Open WhatsApp
                            </a>
                        </div>

                        {/* Platform Briefing Checklist */}
                        <div className="space-y-2.5 pt-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Platform Briefing Checklist (tick while on call)
                            </p>
                            <div className="space-y-2">
                                {BRIEFING_ITEMS.map((item) => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editForm.briefingChecklist?.[item.key])}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    briefingChecklist: {
                                                        ...prev.briefingChecklist,
                                                        [item.key]: e.target.checked
                                                    }
                                                }))
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                        />
                                        <span className="text-xs sm:text-sm text-gray-700">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Call Log / Admin Notes */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                Call Log / Admin Notes
                            </label>
                            <textarea
                                rows={3}
                                maxLength={500}
                                value={editForm.adminNotes}
                                onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                                placeholder="Add call note, follow-up summary, etc."
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                            />
                        </div>

                        {/* Stage / Status & Next Follow-up */}
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Stage / Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                                >
                                    {editingLead.status === 'new' && <option value="new">New</option>}
                                    {editingLead.status !== 'onboarded' && <option value="contacted">Contacted</option>}
                                    <option value="onboarded">Onboarded</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Next follow-up</label>
                                <input
                                    type="text"
                                    maxLength={80}
                                    value={editForm.nextFollowUp}
                                    onChange={(e) => setEditForm({ ...editForm, nextFollowUp: e.target.value })}
                                    placeholder="e.g. 3 Nov, 3:00 pm"
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingLead(null)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={handleSaveModal}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Seller Lead"
                message={
                    deleteTarget
                        ? `Are you sure you want to delete the lead for "${deleteTarget.shopName}" (${deleteTarget.ownerName})?`
                        : ''
                }
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                variant="danger"
            />
        </div>
    );
};

export default SellerLeads;

