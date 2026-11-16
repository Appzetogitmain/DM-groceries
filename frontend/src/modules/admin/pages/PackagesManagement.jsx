import React, { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import {
    HiOutlineCube,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineEye,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineCheck,
    HiOutlineXMark,
    HiOutlineArchiveBox,
    HiOutlineTag,
    HiOutlineUser,
    HiOutlineShieldCheck
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

const PackagesManagement = () => {
    const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'settings'

    // Packages list state
    const [packages, setPackages] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterApproval, setFilterApproval] = useState('all');
    const [summaryCounts, setSummaryCounts] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    // Modals
    const [previewPackage, setPreviewPackage] = useState(null);
    const [rejectingPackage, setRejectingPackage] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // Settings state
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsData, setSettingsData] = useState({
        maxProductsPerPackage: 10,
        minProductsPerPackage: 2,
        maxPackagesPerSeller: 10,
        requireAdminApproval: true,
        requireApprovalOnEdit: true
    });

    // Load packages
    const fetchPackages = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await adminApi.getPackages({
                page,
                limit: pageSize,
                approvalStatus: filterApproval,
                search: searchTerm
            });
            if (res.data?.success) {
                const data = res.data.result || {};
                setPackages(data.items || []);
                setTotal(data.total || 0);
                if (data.summary) {
                    setSummaryCounts(data.summary);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load packages');
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filterApproval, searchTerm]);

    // Load settings
    const fetchSettings = useCallback(async () => {
        setSettingsLoading(true);
        try {
            const res = await adminApi.getPackageSettings();
            if (res.data?.success) {
                setSettingsData(res.data.result || {});
            }
        } catch (error) {
            toast.error('Failed to load package settings');
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'moderation') {
            fetchPackages();
        } else {
            fetchSettings();
        }
    }, [activeTab, fetchPackages, fetchSettings]);

    // Approve package
    const handleApprove = async (pkg) => {
        setIsSubmittingAction(true);
        try {
            const res = await adminApi.approvePackage(pkg._id, {
                approvalNote: 'Approved by Administrator'
            });
            if (res.data?.success) {
                toast.success(`Package "${pkg.name}" approved successfully!`);
                if (previewPackage?._id === pkg._id) {
                    setPreviewPackage(null);
                }
                fetchPackages();
                window.dispatchEvent(new CustomEvent('admin:pending-counts-changed'));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve package');
        } finally {
            setIsSubmittingAction(false);
        }
    };

    // Reject package
    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) {
            toast.error('Please enter a rejection reason.');
            return;
        }
        setIsSubmittingAction(true);
        try {
            const res = await adminApi.rejectPackage(rejectingPackage._id, {
                rejectionReason: rejectionReason.trim()
            });
            if (res.data?.success) {
                toast.success(`Package "${rejectingPackage.name}" rejected.`);
                setRejectingPackage(null);
                setRejectionReason('');
                if (previewPackage?._id === rejectingPackage._id) {
                    setPreviewPackage(null);
                }
                fetchPackages();
                window.dispatchEvent(new CustomEvent('admin:pending-counts-changed'));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject package');
        } finally {
            setIsSubmittingAction(false);
        }
    };

    // Save settings
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            const res = await adminApi.updatePackageSettings(settingsData);
            if (res.data?.success) {
                toast.success('Package limits & settings updated successfully!');
                setSettingsData(res.data.result || settingsData);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setIsSavingSettings(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <HiOutlineCube className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                        Packages Management
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Control seller package limits, bundle limits, and review seller packages for approval.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('moderation')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                            activeTab === 'moderation'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <HiOutlineShieldCheck className="h-4 w-4" />
                        Review Packages
                        {summaryCounts.pending > 0 && (
                            <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                                {summaryCounts.pending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                            activeTab === 'settings'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
                        Limits & Rules
                    </button>
                </div>
            </div>

            {/* TAB 1: MODERATION & REVIEW */}
            {activeTab === 'moderation' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="p-4 border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Packages</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summaryCounts.all}</p>
                        </Card>
                        <Card
                            onClick={() => { setFilterApproval('pending'); setPage(1); }}
                            className={cn(
                                "p-4 cursor-pointer transition-all border",
                                filterApproval === 'pending'
                                    ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                                    : "border-slate-200 dark:border-slate-800 hover:border-amber-400"
                            )}
                        >
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Review</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summaryCounts.pending}</p>
                        </Card>
                        <Card
                            onClick={() => { setFilterApproval('approved'); setPage(1); }}
                            className={cn(
                                "p-4 cursor-pointer transition-all border",
                                filterApproval === 'approved'
                                    ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                            )}
                        >
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summaryCounts.approved}</p>
                        </Card>
                        <Card
                            onClick={() => { setFilterApproval('rejected'); setPage(1); }}
                            className={cn(
                                "p-4 cursor-pointer transition-all border",
                                filterApproval === 'rejected'
                                    ? "ring-2 ring-rose-500 border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                                    : "border-slate-200 dark:border-slate-800 hover:border-rose-400"
                            )}
                        >
                            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected</p>
                            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{summaryCounts.rejected}</p>
                        </Card>
                    </div>

                    {/* Filter Bar */}
                    <Card className="p-4 border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full md:w-96">
                                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Search packages by title or description..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2">
                                    <HiOutlineFunnel className="text-slate-400 h-4 w-4" />
                                    <span className="text-xs text-slate-500 font-medium">Status:</span>
                                    <select
                                        value={filterApproval}
                                        onChange={(e) => { setFilterApproval(e.target.value); setPage(1); }}
                                        className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending Approval</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                <button
                                    onClick={fetchPackages}
                                    title="Refresh"
                                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <HiOutlineArrowPath className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Table View */}
                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                        {isLoading ? (
                            <div className="py-20 text-center text-slate-500">
                                <HiOutlineArrowPath className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-2" />
                                Loading packages...
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="py-20 text-center text-slate-500">
                                <HiOutlineArchiveBox className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Packages Found</h3>
                                <p className="text-sm text-slate-500 mt-1">There are no packages matching the current filter.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                                        <tr>
                                            <th className="px-5 py-3.5">Package</th>
                                            <th className="px-5 py-3.5">Seller</th>
                                            <th className="px-5 py-3.5">Products Included</th>
                                            <th className="px-5 py-3.5">Bundle Price</th>
                                            <th className="px-5 py-3.5">Stock</th>
                                            <th className="px-5 py-3.5">Status</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {packages.map((pkg) => {
                                            const itemCount = pkg.items?.length || 0;
                                            const savings = Math.max(0, (pkg.originalTotalPrice || 0) - (pkg.packagePrice || 0));

                                            return (
                                                <tr key={pkg._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {pkg.coverImage ? (
                                                                <img
                                                                    src={pkg.coverImage}
                                                                    alt={pkg.name}
                                                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                                                                    <HiOutlineCube className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{pkg.name}</p>
                                                                <p className="text-xs text-slate-400">/{pkg.slug}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">{pkg.sellerId?.shopName || 'Unknown Shop'}</p>
                                                            <p className="text-xs text-slate-400">{pkg.sellerId?.email || ''}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <button
                                                            onClick={() => setPreviewPackage(pkg)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                                                        >
                                                            <HiOutlineTag className="h-3.5 w-3.5 text-emerald-600" />
                                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div>
                                                            <span className="font-bold text-slate-900 dark:text-white">₹{pkg.packagePrice}</span>
                                                            {pkg.originalTotalPrice > pkg.packagePrice && (
                                                                <div className="text-xs text-slate-400">
                                                                    <span className="line-through">₹{pkg.originalTotalPrice}</span>
                                                                    <span className="ml-1 text-emerald-600 font-semibold">({pkg.discountPercentage}% OFF)</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            "font-semibold text-xs px-2 py-0.5 rounded-full",
                                                            pkg.stock > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800"
                                                        )}>
                                                            {pkg.stock > 0 ? `${pkg.stock} in stock` : 'Out of stock'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {pkg.approvalStatus === 'approved' && (
                                                            <Badge variant="success" className="capitalize">Approved</Badge>
                                                        )}
                                                        {pkg.approvalStatus === 'pending' && (
                                                            <Badge variant="warning" className="capitalize">Waiting Review</Badge>
                                                        )}
                                                        {pkg.approvalStatus === 'rejected' && (
                                                            <div className="space-y-1">
                                                                <Badge variant="danger" className="capitalize">Rejected</Badge>
                                                                {pkg.rejectionReason && (
                                                                    <p className="text-[11px] text-rose-500 max-w-[140px] truncate" title={pkg.rejectionReason}>
                                                                        {pkg.rejectionReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setPreviewPackage(pkg)}
                                                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition"
                                                                title="Inspect Details"
                                                            >
                                                                <HiOutlineEye className="h-5 w-5" />
                                                            </button>

                                                            {pkg.approvalStatus === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApprove(pkg)}
                                                                        disabled={isSubmittingAction}
                                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                                                                        title="Approve"
                                                                    >
                                                                        <HiOutlineCheck className="h-5 w-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setRejectingPackage(pkg); setRejectionReason(''); }}
                                                                        disabled={isSubmittingAction}
                                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                                                        title="Reject"
                                                                    >
                                                                        <HiOutlineXMark className="h-5 w-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {total > pageSize && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                                <Pagination
                                    currentPage={page}
                                    totalItems={total}
                                    pageSize={pageSize}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* TAB 2: LIMITS & RULES */}
            {activeTab === 'settings' && (
                <div className="max-w-3xl space-y-6">
                    <Card className="p-6 border-slate-200 dark:border-slate-800">
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Package Limits Configuration
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Set platform-wide rules on how many products can be in a package and how many packages sellers can create.
                                </p>
                            </div>

                            {settingsLoading ? (
                                <div className="py-12 text-center text-slate-500">
                                    <HiOutlineArrowPath className="h-6 w-6 animate-spin mx-auto text-emerald-500 mb-2" />
                                    Loading settings...
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Maximum Products per Package
                                            </label>
                                            <input
                                                type="number"
                                                min="2"
                                                max="100"
                                                required
                                                value={settingsData.maxProductsPerPackage}
                                                onChange={(e) => setSettingsData({ ...settingsData, maxProductsPerPackage: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">
                                                Max items a seller can add into a single bundle (default: 10).
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Minimum Products per Package
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                required
                                                value={settingsData.minProductsPerPackage}
                                                onChange={(e) => setSettingsData({ ...settingsData, minProductsPerPackage: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">
                                                Min distinct items required to form a combo (default: 2).
                                            </p>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Maximum Packages Allowed per Seller
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="500"
                                                required
                                                value={settingsData.maxPackagesPerSeller}
                                                onChange={(e) => setSettingsData({ ...settingsData, maxPackagesPerSeller: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">
                                                How many total packages a seller can create on the platform (default: 10).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-4">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                            Approval & Moderation Policies
                                        </h3>

                                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">Require Approval for New Packages</p>
                                                <p className="text-xs text-slate-500">Newly created seller packages will require Admin verification before going live.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settingsData.requireAdminApproval}
                                                    onChange={(e) => setSettingsData({ ...settingsData, requireAdminApproval: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">Require Re-approval on Package Edits</p>
                                                <p className="text-xs text-slate-500">If a seller modifies items or prices of an approved package, it resets to pending review.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settingsData.requireApprovalOnEdit}
                                                    onChange={(e) => setSettingsData({ ...settingsData, requireApprovalOnEdit: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSavingSettings}
                                            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSavingSettings && <HiOutlineArrowPath className="h-4 w-4 animate-spin" />}
                                            Save Package Settings
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </Card>
                </div>
            )}

            {/* PREVIEW / INSPECT MODAL */}
            {previewPackage && (
                <Modal
                    isOpen={Boolean(previewPackage)}
                    onClose={() => setPreviewPackage(null)}
                    title="Package Details & Included Products"
                    maxWidth="max-w-2xl"
                >
                    <div className="space-y-5">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            {previewPackage.coverImage ? (
                                <img
                                    src={previewPackage.coverImage}
                                    alt={previewPackage.name}
                                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <HiOutlineCube className="h-10 w-10" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{previewPackage.name}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Seller: <strong className="text-slate-700 dark:text-slate-300">{previewPackage.sellerId?.shopName}</strong> ({previewPackage.sellerId?.email})</p>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{previewPackage.description || 'No description provided.'}</p>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="text-lg font-black text-emerald-600">₹{previewPackage.packagePrice}</span>
                                    {previewPackage.originalTotalPrice > previewPackage.packagePrice && (
                                        <span className="text-xs text-slate-400 line-through">₹{previewPackage.originalTotalPrice}</span>
                                    )}
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        {previewPackage.discountPercentage}% Discount
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Child Products List */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                                <span>Included Products ({previewPackage.items?.length || 0})</span>
                                <span className="text-xs text-slate-400 font-normal">All must be from this seller</span>
                            </h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                {(previewPackage.items || []).map((it, idx) => {
                                    const prod = it.productId || {};
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900">
                                            <div className="flex items-center gap-3">
                                                {prod.mainImage ? (
                                                    <img src={prod.mainImage} alt={prod.name} className="w-10 h-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <HiOutlineCube className="h-5 w-5" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{prod.name || 'Product'}</p>
                                                    <p className="text-xs text-slate-400">
                                                        Qty in pack: <strong className="text-slate-700 dark:text-slate-300">{it.quantity}x</strong> • Regular: <span className="line-through">₹{it.originalPrice || it.priceAtAddition}</span> • Pack Price: <strong className="text-emerald-600">₹{it.packagePricePerUnit || it.priceAtAddition}</strong> • Stock: {prod.stock || 0}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    ₹{Number((it.packagePricePerUnit || it.priceAtAddition) * it.quantity).toFixed(2)}
                                                </span>
                                                {(it.originalPrice || it.priceAtAddition) > (it.packagePricePerUnit || it.priceAtAddition) && (
                                                    <p className="text-[11px] text-emerald-600 font-medium">
                                                        Save ₹{Number(((it.originalPrice || it.priceAtAddition) - (it.packagePricePerUnit || it.priceAtAddition)) * it.quantity).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Rejection Note if rejected */}
                        {previewPackage.approvalStatus === 'rejected' && previewPackage.rejectionReason && (
                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                                <strong>Rejection Reason:</strong> {previewPackage.rejectionReason}
                            </div>
                        )}

                        {/* Actions in Modal */}
                        {previewPackage.approvalStatus === 'pending' && (
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => { setRejectingPackage(previewPackage); setRejectionReason(''); }}
                                    className="px-4 py-2 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-sm font-semibold transition"
                                >
                                    Reject Package
                                </button>
                                <button
                                    onClick={() => handleApprove(previewPackage)}
                                    disabled={isSubmittingAction}
                                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm"
                                >
                                    Approve Package
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* REJECT MODAL */}
            {rejectingPackage && (
                <Modal
                    isOpen={Boolean(rejectingPackage)}
                    onClose={() => setRejectingPackage(null)}
                    title={`Reject Package: ${rejectingPackage.name}`}
                    maxWidth="max-w-md"
                >
                    <form onSubmit={handleRejectSubmit} className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Please specify the reason for rejecting this package. The seller will see this note and will be able to rectify and resubmit.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                Rejection Reason *
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="E.g. The package price is higher than the sum of individual products, or the cover image does not match the products..."
                                className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setRejectingPackage(null)}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingAction}
                                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-sm"
                            >
                                {isSubmittingAction ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default PackagesManagement;

