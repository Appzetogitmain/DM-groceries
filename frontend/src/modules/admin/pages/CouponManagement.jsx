import React, { useState, useMemo, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import { useToast } from '@shared/components/ui/Toast';
import {
    HiOutlinePlus,
    HiOutlineTicket,
    HiOutlineMagnifyingGlass,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineCalendarDays,
    HiOutlineUsers,
    HiOutlineClock,
    HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../services/adminApi';

const EMPTY_FORM = {
    code: '',
    title: '',
    couponType: 'generic',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    minItems: '',
    maxDiscount: '',
    monthlyVolumeThreshold: '',
    applicableCategories: [],
    usageLimit: '',
    perUserLimit: '1',
    validFrom: '',
    validTill: '',
    description: '',
};

const inputClass =
    'w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-black outline-none ring-1 ring-transparent focus:ring-primary/20';

function categoryIdsFromCoupon(coupon) {
    return (coupon?.applicableCategories || [])
        .map((item) => String(item?._id || item || '').trim())
        .filter(Boolean);
}

function couponOfferSummary(coupon) {
    if (coupon.discountType === 'free_delivery' || coupon.couponType === 'free_delivery') {
        return 'Free Delivery';
    }
    if (coupon.discountType === 'percentage') {
        return `${coupon.discountValue}% OFF`;
    }
    return `₹${coupon.discountValue} OFF`;
}

const CouponManagement = () => {
    const { showToast } = useToast();
    const today = new Date().toISOString().split('T')[0];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);

    const [coupons, setCoupons] = useState([]);
    const [headerCategories, setHeaderCategories] = useState([]);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const isFreeDelivery =
        formData.couponType === 'free_delivery' || formData.discountType === 'free_delivery';
    const showAmountFields = !isFreeDelivery;
    const showMinOrder =
        formData.couponType === 'generic' ||
        formData.couponType === 'min_order_value' ||
        formData.couponType === 'bulk_order' ||
        formData.couponType === 'category_based' ||
        formData.couponType === 'monthly_volume' ||
        formData.couponType === 'free_delivery';
    const minOrderRequired = formData.couponType === 'min_order_value';

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await adminApi.getCategories({ type: 'header' });
                const payload = res?.data?.result;
                const list = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.items)
                        ? payload.items
                        : Array.isArray(res?.data?.results)
                            ? res.data.results
                            : [];
                setHeaderCategories(list.filter((cat) => cat?.type === 'header' || !cat?.type));
            } catch {
                setHeaderCategories([]);
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCoupons();
        }, 500);
        return () => clearTimeout(timer);
    }, [statusFilter, searchTerm]);

    const fetchCoupons = async () => {
        try {
            setIsLoading(true);
            const res = await adminApi.getCoupons({
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: searchTerm.trim() || undefined,
            });
            if (res.data.success) {
                const list = res.data.result || res.data.results || [];
                setCoupons(list);
            }
        } catch (error) {
            showToast('Failed to load coupons', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        const now = new Date();
        const active = coupons.filter(c => {
            const from = c.validFrom ? new Date(c.validFrom) : null;
            const till = c.validTill ? new Date(c.validTill) : null;
            return c.isActive && (!from || from <= now) && (!till || till >= now);
        });
        const expiringSoon = coupons.filter(c => {
            if (!c.validTill) return false;
            const till = new Date(c.validTill);
            const diffDays = (till - now) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7;
        });
        return {
            total: coupons.length,
            active: active.length,
            totalRedeemed: coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0),
            expiringSoon: expiringSoon.length,
        };
    }, [coupons]);

    const filteredCoupons = coupons;

    const handleCouponTypeChange = (nextType) => {
        setFormData((prev) => {
            const next = { ...prev, couponType: nextType };
            if (nextType === 'free_delivery') {
                next.discountType = 'free_delivery';
                next.discountValue = '';
                next.maxDiscount = '';
            } else if (prev.discountType === 'free_delivery') {
                next.discountType = 'percentage';
            }
            if (nextType !== 'category_based') next.applicableCategories = [];
            if (nextType !== 'bulk_order') next.minItems = '';
            if (nextType !== 'monthly_volume') next.monthlyVolumeThreshold = '';
            return next;
        });
    };

    const toggleCategory = (id) => {
        const key = String(id);
        setFormData((prev) => {
            const selected = new Set(prev.applicableCategories.map(String));
            if (selected.has(key)) selected.delete(key);
            else selected.add(key);
            return { ...prev, applicableCategories: Array.from(selected) };
        });
    };

    const handleOpenModal = (coupon = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                ...EMPTY_FORM,
                code: coupon.code || '',
                title: coupon.title || '',
                couponType: coupon.couponType || 'generic',
                discountType: coupon.discountType || 'percentage',
                discountValue: coupon.discountValue ?? '',
                minOrderValue: coupon.minOrderValue ?? '',
                minItems: coupon.minItems ?? '',
                maxDiscount: coupon.maxDiscount ?? '',
                monthlyVolumeThreshold: coupon.monthlyVolumeThreshold ?? '',
                applicableCategories: categoryIdsFromCoupon(coupon),
                usageLimit: coupon.usageLimit ?? '',
                perUserLimit: coupon.perUserLimit ?? '1',
                validFrom: coupon.validFrom ? String(coupon.validFrom).substring(0, 10) : '',
                validTill: coupon.validTill ? String(coupon.validTill).substring(0, 10) : '',
                description: coupon.description || '',
            });
        } else {
            setEditingCoupon(null);
            setFormData({ ...EMPTY_FORM });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.couponType === 'category_based' && formData.applicableCategories.length < 1) {
                showToast('Select at least one category', 'warning');
                return;
            }
            if (formData.couponType === 'bulk_order' && Number(formData.minItems) < 1) {
                showToast('Bulk order coupons need a minimum item count', 'warning');
                return;
            }
            if (formData.couponType === 'monthly_volume' && !(Number(formData.monthlyVolumeThreshold) > 0)) {
                showToast('Set a monthly spend threshold', 'warning');
                return;
            }
            if (formData.couponType === 'min_order_value' && !(Number(formData.minOrderValue) > 0)) {
                showToast('Set a minimum order amount', 'warning');
                return;
            }

            const freeDelivery = formData.couponType === 'free_delivery' || formData.discountType === 'free_delivery';
            const payload = {
                ...formData,
                discountType: freeDelivery ? 'free_delivery' : formData.discountType,
                discountValue: freeDelivery ? 0 : Number(formData.discountValue),
                minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
                minItems: formData.minItems ? Number(formData.minItems) : 0,
                maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
                monthlyVolumeThreshold: formData.monthlyVolumeThreshold
                    ? Number(formData.monthlyVolumeThreshold)
                    : null,
                applicableCategories: formData.applicableCategories,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                perUserLimit: formData.perUserLimit ? Number(formData.perUserLimit) : null,
                validFrom: formData.validFrom,
                validTill: formData.validTill,
            };

            if (editingCoupon?._id) {
                await adminApi.updateCoupon(editingCoupon._id, payload);
                showToast('Coupon updated successfully', 'success');
            } else {
                await adminApi.createCoupon(payload);
                showToast('New coupon launched!', 'success');
            }
            setIsModalOpen(false);
            setEditingCoupon(null);
            const res = await adminApi.getCoupons();
            if (res.data.success) {
                const list = res.data.result || res.data.results || [];
                setCoupons(list);
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save coupon', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await adminApi.deleteCoupon(id);
            setCoupons(coupons.filter(c => c._id !== id));
            setDeleteTarget(null);
            showToast('Coupon removed', 'warning');
        } catch (error) {
            showToast('Failed to delete coupon', 'error');
        }
    };

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="ds-h1 flex items-center gap-3">
                        Promo Engine
                        <Badge variant="primary" className="text-[10px] font-black uppercase tracking-widest">v4.2 PRO</Badge>
                    </h1>
                    <p className="ds-description mt-1">Design, deploy, and track high-conversion discount campaigns.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <HiOutlinePlus className="h-5 w-5" />
                    CREATE NEW PROMO
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Coupons', value: stats.total, icon: HiOutlineTicket, color: 'indigo' },
                    { label: 'Active Codes', value: stats.active, icon: HiOutlineCheckCircle, color: 'emerald' },
                    { label: 'Redemptions', value: stats.totalRedeemed.toLocaleString(), icon: HiOutlineUsers, color: 'amber' },
                    { label: 'Expiring Soon', value: stats.expiringSoon, icon: HiOutlineClock, color: 'rose' },
                ].map((s, i) => (
                    <Card key={i} className="p-6 border-none shadow-xl ring-1 ring-slate-100 bg-white group hover:ring-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2.5 rounded-2xl",
                                s.color === 'indigo' && "bg-brand-50 text-brand-600",
                                s.color === 'emerald' && "bg-brand-50 text-brand-600",
                                s.color === 'amber' && "bg-amber-50 text-amber-600",
                                s.color === 'rose' && "bg-rose-50 text-rose-600",
                            )}>
                                <s.icon className="h-6 w-6" />
                            </div>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</h4>
                        <h3 className="text-2xl font-black text-slate-900">{s.value}</h3>
                    </Card>
                ))}
            </div>

            {/* Main Content Area */}
            <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                {/* Table Filters */}
                <div className="p-4 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative group flex-1 max-w-md">
                            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by code or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-1 ring-transparent focus:ring-primary/10 transition-all"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                            {['all', 'active', 'expired'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={cn(
                                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        statusFilter === filter ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coupons Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coupon Code</th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Offerings</th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Validity</th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading && (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-slate-400 text-sm">
                                        Loading coupons...
                                    </td>
                                </tr>
                            )}
                            {!isLoading && filteredCoupons.map((c) => (
                                <tr key={c._id} className="group hover:bg-slate-50/30 transition-colors">
                                    <td className="px-4 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                                                <HiOutlineTicket className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-black text-slate-900 tracking-wider bg-slate-100 px-2 py-1 rounded-lg border-2 border-dashed border-slate-300">{c.code}</span>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{c.title}</p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-0.5 line-clamp-2">{c.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-900">
                                                {couponOfferSummary(c)}
                                            </p>
                                            {c.minOrderValue > 0 && (
                                                <p className="text-[10px] font-bold text-slate-400">Min. Order: ₹{c.minOrderValue}</p>
                                            )}
                                            {c.couponType === 'bulk_order' && c.minItems > 0 && (
                                                <p className="text-[10px] font-bold text-slate-400">Min. Items: {c.minItems}</p>
                                            )}
                                            {c.couponType === 'monthly_volume' && c.monthlyVolumeThreshold > 0 && (
                                                <p className="text-[10px] font-bold text-slate-400">Monthly spend: ₹{c.monthlyVolumeThreshold}</p>
                                            )}
                                            {c.couponType === 'category_based' && (
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    Categories: {(c.applicableCategories || []).map((cat) => cat?.name || 'Category').join(', ') || 'None'}
                                                </p>
                                            )}
                                            <p className="text-[10px] font-bold text-slate-400 capitalize">Type: {c.couponType?.replace(/_/g, ' ') || 'generic'}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Redeemed</span>
                                                <span className="text-xs font-black text-slate-900">{c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</span>
                                            </div>
                                            <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                                                    style={{ width: c.usageLimit ? `${((c.usedCount || 0) / c.usageLimit) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <HiOutlineCalendarDays className="h-4 w-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-tighter">
                                                {c.validFrom ? new Date(c.validFrom).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'} - {c.validTill ? new Date(c.validTill).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-center">
                                        {(() => {
                                            const now = new Date();
                                            const till = c.validTill ? new Date(c.validTill) : null;
                                            const from = c.validFrom ? new Date(c.validFrom) : null;
                                            
                                            let status = 'inactive';
                                            let variant = 'gray';
                                            
                                            if (!c.isActive) {
                                                status = 'inactive';
                                                variant = 'gray';
                                            } else if (till && till < now) {
                                                status = 'expired';
                                                variant = 'error';
                                            } else if (from && from > now) {
                                                status = 'scheduled';
                                                variant = 'warning';
                                            } else if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) {
                                                status = 'exhausted';
                                                variant = 'gray';
                                            } else {
                                                status = 'active';
                                                variant = 'success';
                                            }
                                            
                                            return (
                                                <Badge variant={variant} className="text-[9px] font-black uppercase">
                                                    {status}
                                                </Badge>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(c)}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                            >
                                                <HiOutlinePencilSquare className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(c)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <HiOutlineTrash className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredCoupons.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <HiOutlineTicket className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">No codes found</h3>
                        <p className="text-sm font-bold text-slate-400 mt-2">Try adjusting your filters or create a new promotion.</p>
                    </div>
                )}
            </Card>

            {/* Delete confirmation dialog */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                                    <HiOutlineTrash className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Delete coupon?</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Are you sure you want to remove{' '}
                                    <span className="font-semibold text-slate-900">{deleteTarget.code}</span>? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deleteTarget._id)}
                                        className="px-4 py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal for Create/Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCoupon ? "Modify Promotion" : "New Promotion Protocol"}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promo Code</label>
                            <input
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="E.G. SUMMER50"
                                className={`${inputClass} uppercase tracking-widest`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign Title</label>
                            <input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Optional internal title"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coupon Strategy</label>
                            <select
                                value={formData.couponType}
                                onChange={(e) => handleCouponTypeChange(e.target.value)}
                                className={inputClass}
                            >
                                <option value="generic">Generic Discount</option>
                                <option value="bulk_order">Bulk Order Discount</option>
                                <option value="min_order_value">Minimum Order Value Coupon</option>
                                <option value="free_delivery">Free Delivery Coupon</option>
                                <option value="category_based">Category-Based Coupon</option>
                                <option value="monthly_volume">Monthly Volume Coupon</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount Kind</label>
                            <select
                                value={isFreeDelivery ? 'free_delivery' : formData.discountType}
                                disabled={formData.couponType === 'free_delivery'}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    let currentVal = formData.discountValue;
                                    if (newType === 'percentage' && Number(currentVal) > 100) {
                                        currentVal = '100';
                                    }
                                    setFormData({
                                        ...formData,
                                        discountType: newType,
                                        discountValue: newType === 'free_delivery' ? '' : currentVal,
                                        couponType: newType === 'free_delivery' ? 'free_delivery' : formData.couponType,
                                    });
                                }}
                                className={inputClass}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                                <option value="free_delivery">Free Delivery</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 -mt-3">
                        Fields below change with the strategy. Category coupons need categories; bulk coupons need a min item count.
                    </p>

                    {showAmountFields && (
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {formData.discountType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Value (%)'}
                                </label>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    max={formData.discountType === 'percentage' ? 100 : undefined}
                                    onWheel={(e) => e.target.blur()}
                                    onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                    value={formData.discountValue}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (formData.discountType === 'percentage' && Number(val) > 100) {
                                            val = '100';
                                        }
                                        setFormData({ ...formData, discountValue: val });
                                    }}
                                    className={inputClass}
                                />
                            </div>
                            {formData.discountType === 'percentage' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Discount ₹ (optional)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        onWheel={(e) => e.target.blur()}
                                        onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                        value={formData.maxDiscount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {showMinOrder && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {minOrderRequired ? 'Minimum Order Value (₹)' : 'Min Order ₹ (optional)'}
                            </label>
                            <input
                                required={minOrderRequired}
                                type="number"
                                min={minOrderRequired ? 1 : 0}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                value={formData.minOrderValue}
                                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                placeholder={minOrderRequired ? 'Required' : '0'}
                                className={inputClass}
                            />
                        </div>
                    )}

                    {formData.couponType === 'bulk_order' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minimum Items In Cart</label>
                            <input
                                required
                                type="number"
                                min={1}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                value={formData.minItems}
                                onChange={(e) => setFormData({ ...formData, minItems: e.target.value })}
                                placeholder="e.g. 10"
                                className={inputClass}
                            />
                        </div>
                    )}

                    {formData.couponType === 'monthly_volume' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Spend Threshold (₹)</label>
                            <input
                                required
                                type="number"
                                min={1}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                value={formData.monthlyVolumeThreshold}
                                onChange={(e) => setFormData({ ...formData, monthlyVolumeThreshold: e.target.value })}
                                placeholder="e.g. 5000"
                                className={inputClass}
                            />
                        </div>
                    )}

                    {formData.couponType === 'category_based' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicable Header Categories</label>
                            {headerCategories.length === 0 ? (
                                <p className="text-xs font-bold text-slate-400">No header categories found.</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto rounded-2xl ring-1 ring-slate-100 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {headerCategories.map((cat) => {
                                        const id = String(cat._id);
                                        const checked = formData.applicableCategories.map(String).includes(id);
                                        return (
                                            <label key={id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCategory(id)}
                                                    className="rounded border-slate-300"
                                                />
                                                <span className="truncate">{cat.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Uses (optional)</label>
                            <input
                                type="number"
                                min={0}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                value={formData.usageLimit}
                                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per User Limit</label>
                            <input
                                type="number"
                                min={1}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                                value={formData.perUserLimit}
                                onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                            <input
                                required
                                type="date"
                                min={today}
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                            <input
                                required
                                type="date"
                                min={formData.validFrom || today}
                                value={formData.validTill}
                                onChange={(e) => setFormData({ ...formData, validTill: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign Description</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Briefly describe the campaign..."
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {editingCoupon ? 'SAVE CHANGES' : 'LAUNCH CAMPAIGN'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CouponManagement;
