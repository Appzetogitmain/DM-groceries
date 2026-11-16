import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { sellerApi } from '../services/sellerApi';
import { toast } from 'sonner';
import {
    HiOutlineCube,
    HiOutlinePlus,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlineArrowPath,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineEye,
    HiOutlineTag,
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineXCircle,
    HiOutlinePhoto,
    HiOutlineMinus,
    HiOutlineArchiveBox
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

const Packages = () => {
    const [packages, setPackages] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterApproval, setFilterApproval] = useState('all');

    const [quota, setQuota] = useState({
        used: 0,
        maxAllowed: 10,
        remaining: 10,
        canCreate: true,
        minProductsPerPackage: 2,
        maxProductsPerPackage: 10,
        requireAdminApproval: true
    });

    const [summaryCounts, setSummaryCounts] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [viewingPackage, setViewingPackage] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [packageToDelete, setPackageToDelete] = useState(null);

    // Create / Edit Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        packagePrice: '',
        coverImage: '',
        coverImageFile: null,
        items: [] // array of { productId, name, price, mainImage, quantity, stock }
    });

    // Eligible products list for picker
    const [eligibleProducts, setEligibleProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);

    // Fetch packages list & quota
    const fetchPackages = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await sellerApi.getPackages({
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
                if (data.quota) {
                    setQuota((prev) => ({ ...prev, ...data.quota }));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load packages');
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filterApproval, searchTerm]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    // Fetch eligible products when opening create/edit modal
    const fetchEligibleProducts = useCallback(async (searchQuery = '') => {
        setLoadingProducts(true);
        try {
            const params = {};
            if (searchQuery && searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            const res = await sellerApi.getEligibleProductsForPackage(params);
            if (res.data?.success) {
                const raw = res.data.result?.products || res.data.results || res.data.result || [];
                setEligibleProducts(Array.isArray(raw) ? raw : []);
            }
        } catch (error) {
            toast.error('Failed to load your eligible products');
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    // Debounce product search to backend
    useEffect(() => {
        if (!isCreateModalOpen) return;
        const timer = setTimeout(() => {
            fetchEligibleProducts(productSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch, isCreateModalOpen, fetchEligibleProducts]);

    const handleOpenCreateModal = () => {
        if (!quota.canCreate) {
            toast.error(`You have reached the limit of ${quota.maxAllowed} packages. Delete or deactivate existing packages to create a new one.`);
            return;
        }
        setEditingPackage(null);
        setProductSearch('');
        setFormData({
            name: '',
            description: '',
            packagePrice: '',
            coverImage: '',
            coverImageFile: null,
            items: []
        });
        fetchEligibleProducts('');
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (pkg) => {
        setEditingPackage(pkg);
        setProductSearch('');
        const mappedItems = (pkg.items || []).map((it) => ({
            productId: it.productId?._id || it.productId,
            name: it.productId?.name || 'Product',
            regularPrice: it.originalPrice || it.priceAtAddition || it.productId?.salePrice || it.productId?.price || 0,
            packagePrice: it.packagePricePerUnit || it.priceAtAddition || it.productId?.salePrice || it.productId?.price || 0,
            mainImage: it.productId?.mainImage || '',
            quantity: it.quantity || 1,
            stock: it.productId?.stock || 0
        }));

        setFormData({
            name: pkg.name || '',
            description: pkg.description || '',
            packagePrice: pkg.packagePrice || '',
            coverImage: pkg.coverImage || '',
            coverImageFile: null,
            items: mappedItems
        });
        fetchEligibleProducts('');
        setIsCreateModalOpen(true);
    };

    // Add or remove product in package form
    const toggleProductInPackage = (prod) => {
        const existingIdx = formData.items.findIndex(
            (it) => it.productId === (prod._id || prod.productId)
        );

        if (existingIdx >= 0) {
            // Remove
            const updated = formData.items.filter((_, idx) => idx !== existingIdx);
            const newPackageTotal = updated.reduce((sum, it) => {
                const p = parseFloat(it.packagePrice);
                return sum + (isNaN(p) ? 0 : p) * (Number(it.quantity) || 1);
            }, 0);
            setFormData((prev) => ({
                ...prev,
                items: updated,
                packagePrice: Math.round(newPackageTotal * 100) / 100
            }));
        } else {
            // Check max products limit
            if (formData.items.length >= (quota.maxProductsPerPackage || 10)) {
                toast.error(`You can add up to ${quota.maxProductsPerPackage || 10} products per package.`);
                return;
            }
            const unitPrice = prod.salePrice > 0 ? prod.salePrice : prod.price;
            const newItem = {
                productId: prod._id,
                name: prod.name,
                regularPrice: unitPrice,
                packagePrice: unitPrice,
                mainImage: prod.mainImage,
                quantity: 1,
                stock: prod.stock || 0
            };
            const updated = [...formData.items, newItem];
            const newPackageTotal = updated.reduce((sum, it) => {
                const p = parseFloat(it.packagePrice);
                return sum + (isNaN(p) ? 0 : p) * (Number(it.quantity) || 1);
            }, 0);
            setFormData((prev) => ({
                ...prev,
                items: updated,
                packagePrice: Math.round(newPackageTotal * 100) / 100
            }));
        }
    };

    // Update custom pack price for a specific product
    const updateItemPrice = (productId, newPrice) => {
        const val = parseFloat(newPrice);
        const updated = formData.items.map((it) => {
            if (it.productId === productId) {
                return {
                    ...it,
                    packagePrice: newPrice === '' ? '' : (isNaN(val) ? 0 : val)
                };
            }
            return it;
        });

        const newPackageTotal = updated.reduce((sum, it) => {
            const p = parseFloat(it.packagePrice);
            return sum + (isNaN(p) ? 0 : p) * (Number(it.quantity) || 1);
        }, 0);

        setFormData((prev) => ({
            ...prev,
            items: updated,
            packagePrice: Math.round(newPackageTotal * 100) / 100
        }));
    };

    // Change quantity of product in package form
    const updateItemQuantity = (productId, newQty) => {
        const qty = Math.max(1, parseInt(newQty, 10) || 1);
        const updated = formData.items.map((it) => {
            if (it.productId === productId) {
                return { ...it, quantity: qty };
            }
            return it;
        });

        const newPackageTotal = updated.reduce((sum, it) => {
            const p = parseFloat(it.packagePrice);
            return sum + (isNaN(p) ? 0 : p) * (Number(it.quantity) || 1);
        }, 0);

        setFormData((prev) => ({
            ...prev,
            items: updated,
            packagePrice: Math.round(newPackageTotal * 100) / 100
        }));
    };

    // Calculate original total price and discount
    const originalTotalPrice = useMemo(() => {
        return formData.items.reduce((sum, it) => sum + (Number(it.regularPrice || it.price || 0) * Number(it.quantity || 1)), 0);
    }, [formData.items]);

    const discountDetails = useMemo(() => {
        const pkgPrice = parseFloat(formData.packagePrice) || 0;
        if (originalTotalPrice <= 0 || pkgPrice <= 0) return { savings: 0, percent: 0 };
        const savings = Math.max(0, originalTotalPrice - pkgPrice);
        const percent = Math.round((savings / originalTotalPrice) * 100);
        return { savings, percent };
    }, [originalTotalPrice, formData.packagePrice]);

    // Handle form submit (Create or Update)
    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (formData.items.length < (quota.minProductsPerPackage || 2)) {
            toast.error(`Please select at least ${quota.minProductsPerPackage || 2} products for the package.`);
            return;
        }

        if (formData.items.length > (quota.maxProductsPerPackage || 10)) {
            toast.error(`A package cannot have more than ${quota.maxProductsPerPackage || 10} products.`);
            return;
        }

        // Validate each item price
        for (const it of formData.items) {
            const p = parseFloat(it.packagePrice);
            if (isNaN(p) || p <= 0) {
                toast.error(`Please enter a valid pack price for "${it.name}".`);
                return;
            }
            if (p > it.regularPrice) {
                toast.error(`Pack price for "${it.name}" (₹${p}) cannot exceed its regular price (₹${it.regularPrice}).`);
                return;
            }
        }

        const pkgPrice = parseFloat(formData.packagePrice);
        if (isNaN(pkgPrice) || pkgPrice <= 0) {
            toast.error('Please enter a valid package price.');
            return;
        }

        if (pkgPrice > originalTotalPrice) {
            toast.error(`Package price (₹${pkgPrice}) cannot be greater than regular total price (₹${originalTotalPrice}).`);
            return;
        }

        setIsSubmittingForm(true);
        try {
            const payloadItems = formData.items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
                originalPrice: Number(it.regularPrice) || 0,
                packagePricePerUnit: parseFloat(it.packagePrice) || Number(it.regularPrice) || 0
            }));

            const formPayload = new FormData();
            formPayload.append('name', formData.name.trim());
            formPayload.append('description', formData.description.trim());
            formPayload.append('packagePrice', pkgPrice);
            formPayload.append('items', JSON.stringify(payloadItems));

            if (formData.coverImageFile) {
                formPayload.append('coverImage', formData.coverImageFile);
            } else if (formData.coverImage) {
                formPayload.append('coverImage', formData.coverImage);
            }

            if (editingPackage) {
                const res = await sellerApi.updatePackage(editingPackage._id, formPayload);
                if (res.data?.success) {
                    toast.success(res.data.message || 'Package updated successfully!');
                    setIsCreateModalOpen(false);
                    fetchPackages();
                }
            } else {
                const res = await sellerApi.createPackage(formPayload);
                if (res.data?.success) {
                    toast.success(res.data.message || 'Package created successfully!');
                    setIsCreateModalOpen(false);
                    fetchPackages();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save package');
        } finally {
            setIsSubmittingForm(false);
        }
    };

    // Toggle active / inactive
    const handleToggleStatus = async (pkg) => {
        try {
            const res = await sellerApi.togglePackageStatus(pkg._id);
            if (res.data?.success) {
                toast.success(res.data.message || 'Package status updated');
                fetchPackages();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    // Delete package
    const handleDeletePackage = async () => {
        if (!packageToDelete) return;
        setIsDeleting(true);
        try {
            const res = await sellerApi.deletePackage(packageToDelete._id);
            if (res.data?.success) {
                toast.success('Package deleted successfully');
                setPackageToDelete(null);
                fetchPackages();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete package');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filtered eligible products for picker
    const filteredEligibleProducts = useMemo(() => {
        if (!productSearch.trim()) return eligibleProducts;
        const q = productSearch.toLowerCase();
        return eligibleProducts.filter(
            (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
        );
    }, [eligibleProducts, productSearch]);

    // Percentage of quota used
    const quotaPercentage = Math.min(100, Math.round(((quota.used || 0) / (quota.maxAllowed || 10)) * 100));

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <HiOutlineCube className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                        Packages & Combos
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Group your listed products into attractive combo bundles and sell them together.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreateModal}
                    disabled={!quota.canCreate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <HiOutlinePlus className="h-5 w-5" />
                    Create Package
                </button>
            </div>

            {/* Quota Progress Banner */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/5 via-slate-50 to-emerald-500/5 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Package Quota Status
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                {quota.used} / {quota.maxAllowed} Used
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            You can create up to <strong className="text-slate-900 dark:text-white">{quota.maxAllowed} packages</strong> on DM Groceries.
                            Each package can contain up to <strong className="text-slate-900 dark:text-white">{quota.maxProductsPerPackage} products</strong>.
                        </p>
                    </div>

                    <div className="w-full md:w-64 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                            <span>{quota.remaining} slots remaining</span>
                            <span>{quotaPercentage}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    quotaPercentage >= 100
                                        ? "bg-rose-500"
                                        : quotaPercentage >= 80
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                )}
                                style={{ width: `${quotaPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                        onClick={() => { setFilterApproval('all'); setPage(1); }}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition",
                            filterApproval === 'all'
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        All ({summaryCounts.all})
                    </button>
                    <button
                        onClick={() => { setFilterApproval('approved'); setPage(1); }}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5",
                            filterApproval === 'approved'
                                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Approved ({summaryCounts.approved})
                    </button>
                    <button
                        onClick={() => { setFilterApproval('pending'); setPage(1); }}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5",
                            filterApproval === 'pending'
                                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Under Review ({summaryCounts.pending})
                    </button>
                    <button
                        onClick={() => { setFilterApproval('rejected'); setPage(1); }}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5",
                            filterApproval === 'rejected'
                                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Rejected ({summaryCounts.rejected})
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search your packages..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <button
                        onClick={fetchPackages}
                        title="Refresh"
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <HiOutlineArrowPath className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Packages Table */}
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-500">
                        <HiOutlineArrowPath className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-2" />
                        Loading packages...
                    </div>
                ) : packages.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <HiOutlineArchiveBox className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Packages Created Yet</h3>
                        <p className="text-sm text-slate-500 mt-1">Start by creating combo packs from your approved products to boost sales.</p>
                        {quota.canCreate && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                            >
                                <HiOutlinePlus className="h-4 w-4" />
                                Create Your First Package
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700 font-semibold">
                                <tr>
                                    <th className="px-5 py-3.5">Package</th>
                                    <th className="px-5 py-3.5">Products Included</th>
                                    <th className="px-5 py-3.5">Combo Price</th>
                                    <th className="px-5 py-3.5">Stock</th>
                                    <th className="px-5 py-3.5">Review Status</th>
                                    <th className="px-5 py-3.5">Live Status</th>
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
                                                        <p className="text-xs text-slate-400 line-clamp-1">{pkg.description || 'No description'}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => setViewingPackage(pkg)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                                                >
                                                    <HiOutlineTag className="h-3.5 w-3.5 text-emerald-600" />
                                                    {itemCount} items
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
                                                    {pkg.stock > 0 ? `${pkg.stock} packs` : 'Out of stock'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                {pkg.approvalStatus === 'approved' && (
                                                    <Badge variant="success">Approved</Badge>
                                                )}
                                                {pkg.approvalStatus === 'pending' && (
                                                    <Badge variant="warning">Under Review</Badge>
                                                )}
                                                {pkg.approvalStatus === 'rejected' && (
                                                    <div className="space-y-1">
                                                        <Badge variant="danger">Rejected</Badge>
                                                        {pkg.rejectionReason && (
                                                            <p className="text-[11px] text-rose-600 font-medium max-w-[150px] truncate" title={pkg.rejectionReason}>
                                                                {pkg.rejectionReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => handleToggleStatus(pkg)}
                                                    className={cn(
                                                        "px-2.5 py-1 text-xs font-semibold rounded-full transition",
                                                        pkg.status === 'active'
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200"
                                                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300"
                                                    )}
                                                >
                                                    {pkg.status === 'active' ? 'Active' : 'Paused'}
                                                </button>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setViewingPackage(pkg)}
                                                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                        title="View Details"
                                                    >
                                                        <HiOutlineEye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditModal(pkg)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                                                        title="Edit Package"
                                                    >
                                                        <HiOutlinePencilSquare className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setPackageToDelete(pkg)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                                        title="Delete Package"
                                                    >
                                                        <HiOutlineTrash className="h-4 w-4" />
                                                    </button>
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

            {/* CREATE / EDIT PACKAGE MODAL */}
            {isCreateModalOpen && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title={editingPackage ? `Edit Package: ${editingPackage.name}` : 'Create New Package'}
                    maxWidth="max-w-3xl"
                >
                    <form onSubmit={handleSubmitForm} className="space-y-6">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                1. Package Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Package Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Weekly Breakfast Essentials Pack"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Describe what makes this combo special..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Cover Image
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setFormData({
                                                        ...formData,
                                                        coverImageFile: file,
                                                        coverImage: URL.createObjectURL(file)
                                                    });
                                                }
                                            }}
                                            className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                        />
                                        {formData.coverImage && (
                                            <img
                                                src={formData.coverImage}
                                                alt="Preview"
                                                className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                                            />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">If omitted, the main image of the first included product will be used.</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Product Picker */}
                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        2. Select Products to Include ({formData.items.length} / {quota.maxProductsPerPackage || 10} max)
                                    </h3>
                                    <p className="text-xs text-slate-500">Only your listed, approved, and active products appear here.</p>
                                </div>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    formData.items.length >= (quota.minProductsPerPackage || 2)
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                )}>
                                    Min: {quota.minProductsPerPackage || 2} items
                                </span>
                            </div>

                            {/* Selected Items List */}
                            {formData.items.length > 0 && (
                                <div className="space-y-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                            Included Products & Item Pack Pricing:
                                        </p>
                                        <span className="text-[11px] text-slate-500">
                                            Set each product's price for this bundle
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {formData.items.map((it) => {
                                            const itemReg = Number(it.regularPrice || 0);
                                            const itemPack = parseFloat(it.packagePrice) || 0;
                                            const itemSubtotal = itemPack * (Number(it.quantity) || 1);
                                            const itemSavings = (itemReg - itemPack) * (Number(it.quantity) || 1);

                                            return (
                                                <div
                                                    key={it.productId}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 gap-2.5 text-xs shadow-xs"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        {it.mainImage ? (
                                                            <img
                                                                src={it.mainImage}
                                                                alt={it.name}
                                                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                                <HiOutlineCube className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                                {it.name}
                                                            </p>
                                                            <p className="text-slate-400 text-[11px]">
                                                                Available Stock: <strong className="text-slate-700 dark:text-slate-300">{it.stock}</strong>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                                                        {/* Regular Price (Displayed in front) */}
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700">
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Regular:</span>
                                                            <span className="font-semibold text-slate-500 line-through">
                                                                ₹{itemReg.toFixed(2)}
                                                            </span>
                                                        </div>

                                                        {/* Pack Price Input */}
                                                        <div className="flex items-center gap-1.5">
                                                            <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                                                                Pack Price:
                                                            </label>
                                                            <div className="relative w-24">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                                                                    ₹
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="1"
                                                                    max={itemReg > 0 ? itemReg : undefined}
                                                                    value={it.packagePrice}
                                                                    onChange={(e) => updateItemPrice(it.productId, e.target.value)}
                                                                    placeholder={itemReg.toString()}
                                                                    className="w-full pl-5 pr-1.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                    title="Set discount price for this product in package"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Quantity Stepper */}
                                                        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900/30">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItemQuantity(it.productId, it.quantity - 1)}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                                                title="Decrease quantity"
                                                            >
                                                                <HiOutlineMinus className="h-3 w-3" />
                                                            </button>
                                                            <span className="font-bold px-1.5 min-w-[20px] text-center text-xs">
                                                                {it.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItemQuantity(it.productId, it.quantity + 1)}
                                                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                                                title="Increase quantity"
                                                            >
                                                                <HiOutlinePlus className="h-3 w-3" />
                                                            </button>
                                                        </div>

                                                        {/* Item Subtotal & Savings */}
                                                        <div className="text-right min-w-[65px]">
                                                            <span className="font-bold text-slate-900 dark:text-white block">
                                                                ₹{itemSubtotal.toFixed(2)}
                                                            </span>
                                                            {itemSavings > 0 && (
                                                                <span className="text-[10px] text-emerald-600 font-semibold block leading-none">
                                                                    Save ₹{itemSavings.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Remove from package */}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleProductInPackage(it)}
                                                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition"
                                                            title="Remove product"
                                                        >
                                                            <HiOutlineTrash className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Product Search & Picker Box */}
                            <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40">
                                <div className="relative">
                                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search your listed products to add..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>

                                <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                                    {loadingProducts ? (
                                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                            <HiOutlineArrowPath className="h-4 w-4 animate-spin text-emerald-500" />
                                            Searching your products...
                                        </div>
                                    ) : filteredEligibleProducts.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            {productSearch.trim() ? (
                                                <p>No products matching &quot;{productSearch}&quot;</p>
                                            ) : (
                                                <p>No approved products found in your inventory. Only active and approved products can be packaged.</p>
                                            )}
                                        </div>
                                    ) : (
                                        filteredEligibleProducts.map((p) => {
                                            const isSelected = formData.items.some((it) => it.productId === p._id);
                                            const unitPrice = p.salePrice > 0 ? p.salePrice : p.price;

                                            return (
                                                <div key={p._id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-xs">
                                                    <div className="flex items-center gap-2.5">
                                                        {p.mainImage ? (
                                                            <img src={p.mainImage} alt={p.name} className="w-8 h-8 rounded object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                                <HiOutlineCube className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white line-clamp-1">{p.name}</p>
                                                            <p className="text-slate-400">SKU: {p.sku || 'N/A'} • ₹{unitPrice} • Stock: {p.stock || 0}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleProductInPackage(p)}
                                                        className={cn(
                                                            "px-3 py-1 rounded-lg text-xs font-semibold transition",
                                                            isSelected
                                                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                        )}
                                                    >
                                                        {isSelected ? 'Remove' : '+ Add'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Pricing & Discount */}
                        <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                3. Final Package Pricing & Customer Savings
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 font-medium">Regular Total Price of Items:</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                        ₹{originalTotalPrice.toFixed(2)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Calculated from standard catalog prices of all included items.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Package Selling Price (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max={originalTotalPrice > 0 ? originalTotalPrice : undefined}
                                        required
                                        placeholder="Auto-calculated from items"
                                        value={formData.packagePrice}
                                        onChange={(e) => setFormData({ ...formData, packagePrice: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Final package price auto-summed from individual item pack prices.
                                    </p>
                                    {discountDetails.percent > 0 && (
                                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                                            🎉 Customer saves ₹{discountDetails.savings.toFixed(2)} ({discountDetails.percent}% OFF)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submission Banner */}
                        {quota.requireAdminApproval && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                                <HiOutlineClock className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                                <div>
                                    <strong>Admin Approval Required:</strong> Upon saving, your package will be submitted to the DM Groceries Admin team for verification before appearing in search or store fronts.
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingForm}
                                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmittingForm && <HiOutlineArrowPath className="h-4 w-4 animate-spin" />}
                                {editingPackage ? 'Update & Submit Package' : 'Create & Submit Package'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* VIEW PACKAGE DETAILS MODAL */}
            {viewingPackage && (
                <Modal
                    isOpen={Boolean(viewingPackage)}
                    onClose={() => setViewingPackage(null)}
                    title="Package Overview"
                    maxWidth="max-w-xl"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            {viewingPackage.coverImage ? (
                                <img
                                    src={viewingPackage.coverImage}
                                    alt={viewingPackage.name}
                                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <HiOutlineCube className="h-8 w-8" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">{viewingPackage.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">{viewingPackage.description || 'No description'}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-base font-bold text-emerald-600">₹{viewingPackage.packagePrice}</span>
                                    {viewingPackage.originalTotalPrice > viewingPackage.packagePrice && (
                                        <span className="text-xs text-slate-400 line-through">₹{viewingPackage.originalTotalPrice}</span>
                                    )}
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        {viewingPackage.discountPercentage}% OFF
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Review Status Note */}
                        {viewingPackage.approvalStatus === 'rejected' && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                                <strong>Admin Rejection Reason:</strong> {viewingPackage.rejectionReason}
                                <div className="mt-2">
                                    <button
                                        onClick={() => {
                                            setViewingPackage(null);
                                            handleOpenEditModal(viewingPackage);
                                        }}
                                        className="text-xs font-bold underline hover:text-rose-900"
                                    >
                                        Edit and resubmit this package now
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Included Products List */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Products in this Package ({viewingPackage.items?.length || 0})
                            </h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                                {(viewingPackage.items || []).map((it, idx) => {
                                    const prod = it.productId || {};
                                    const regPrice = it.originalPrice || it.priceAtAddition || prod.price || 0;
                                    const packPrice = it.packagePricePerUnit || it.priceAtAddition || prod.price || 0;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 text-xs">
                                            <div className="flex items-center gap-2.5">
                                                {prod.mainImage && (
                                                    <img src={prod.mainImage} alt={prod.name} className="w-8 h-8 rounded object-cover" />
                                                )}
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{prod.name || 'Product'}</p>
                                                    <p className="text-slate-400">
                                                        Qty: <strong className="text-slate-700 dark:text-slate-300">{it.quantity}x</strong> • Regular: <span className="line-through">₹{regPrice}</span> • Pack Price: <strong className="text-emerald-600">₹{packPrice}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    ₹{(packPrice * it.quantity).toFixed(2)}
                                                </span>
                                                {regPrice > packPrice && (
                                                    <p className="text-[10px] text-emerald-600 font-medium">Save ₹{((regPrice - packPrice) * it.quantity).toFixed(2)}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setViewingPackage(null)}
                                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {packageToDelete && (
                <Modal
                    isOpen={Boolean(packageToDelete)}
                    onClose={() => setPackageToDelete(null)}
                    title="Delete Package"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to permanently delete the package <strong className="text-slate-900 dark:text-white">&quot;{packageToDelete.name}&quot;</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setPackageToDelete(null)}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeletePackage}
                                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-sm"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Package'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Packages;

