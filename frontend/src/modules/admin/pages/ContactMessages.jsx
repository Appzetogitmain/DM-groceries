import React, { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Pagination from '@shared/components/ui/Pagination';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';
import { cn } from '@/lib/utils';
import { Check, RotateCcw, Trash2, Mail, Phone, Loader2, Inbox } from 'lucide-react';

const TABS = [
    { key: 'new', label: 'New' },
    { key: 'resolved', label: 'Resolved' },
    { key: '', label: 'All' }
];

const ContactMessages = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('new');
    const [items, setItems] = useState([]);
    const [newCount, setNewCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);

    const fetchItems = useCallback(async (requestedPage = 1) => {
        try {
            setLoading(true);
            const res = await adminApi.getContactMessages({
                page: requestedPage,
                limit: pageSize,
                status: tab || undefined
            });
            const payload = res.data?.result || {};
            setItems(Array.isArray(payload.items) ? payload.items : []);
            setNewCount(payload.newCount || 0);
            setTotal(payload.total || 0);
            setPage(payload.page || requestedPage);
        } catch (error) {
            showToast('Failed to load messages', 'error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, pageSize]);

    useEffect(() => {
        fetchItems(1);
    }, [fetchItems]);

    const setStatus = async (item, status) => {
        try {
            await adminApi.updateContactMessage(item._id, { status });
            fetchItems(page);
        } catch (error) {
            showToast(error.response?.data?.message || 'Update failed', 'error');
        }
    };

    const remove = async (item) => {
        if (!window.confirm(`Delete message from ${item.name}?`)) return;
        try {
            await adminApi.deleteContactMessage(item._id);
            showToast('Message deleted', 'success');
            fetchItems(page);
        } catch (error) {
            showToast(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Inbox className="text-green-700" /> Contact Messages
                </h1>
                <p className="text-sm text-gray-500">Messages sent from the landing page Contact Us form.</p>
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
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
                        {t.key === 'new' && <span className="ml-1.5 text-xs opacity-70">{newCount}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-700" /></div>
            ) : items.length === 0 ? (
                <Card className="p-10 text-center text-gray-500">No messages found.</Card>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <Card key={item._id} className="p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-bold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                                </div>
                                <Badge variant={item.status === 'new' ? 'warning' : 'success'}>{item.status}</Badge>
                            </div>
                            {item.subject && <p className="font-semibold text-gray-800">{item.subject}</p>}
                            <p className="text-sm text-gray-600 whitespace-pre-line break-words">{item.message}</p>
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-sm">
                                {item.email && (
                                    <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 text-green-800 hover:underline">
                                        <Mail size={14} /> {item.email}
                                    </a>
                                )}
                                {item.phone && (
                                    <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 text-green-800 hover:underline">
                                        <Phone size={14} /> {item.phone}
                                    </a>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                    {item.status === 'new' ? (
                                        <button
                                            onClick={() => setStatus(item, 'resolved')}
                                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800"
                                        >
                                            <Check size={14} /> Mark resolved
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setStatus(item, 'new')}
                                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        >
                                            <RotateCcw size={14} /> Reopen
                                        </button>
                                    )}
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
        </div>
    );
};

export default ContactMessages;
