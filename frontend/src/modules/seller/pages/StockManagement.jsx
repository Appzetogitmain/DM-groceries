import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import Badge from '@shared/components/ui/Badge';
import Input from '@shared/components/ui/Input';
import Pagination from '@shared/components/ui/Pagination';
import {
    HiOutlineCube,
    HiOutlineExclamationTriangle,
    HiOutlineArchiveBoxXMark,
    HiOutlineArrowsUpDown,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlinePlus,
    HiOutlineMinus,
    HiOutlineArrowPath,
    HiOutlineClipboardDocumentList,
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlineCalendarDays,
    HiOutlineChevronDown,
    HiOutlineChevronUp
} from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { sellerApi } from '../services/sellerApi';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import { translateStatus, sellerLocale } from "../i18n/format";

const StockManagement = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('inventory'); // 'inventory' or 'history'
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [expandedItems, setExpandedItems] = useState({});
    const [adjustType, setAdjustType] = useState('Restock');
    const [adjustValue, setAdjustValue] = useState('');
    const [adjustNote, setAdjustNote] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [isLocked, setIsLocked] = useState(false);
    const [isCheckingPlan, setIsCheckingPlan] = useState(false); // [SUBSCRIPTION DISABLED] was useState(true)

    /* [SUBSCRIPTION DISABLED] plan-feature check that locked this page
    React.useEffect(() => {
        sellerApi.getCurrentSubscription().then(res => {
            if (res.data?.success) {
                const feats = res.data.result?.plan?.features || [];
                const normalizeCode = (code) => String(code || "").toUpperCase().replace(/[_ ]/g, "");
                const hasIt = feats.some(f => normalizeCode(f.code) === "INVENTORYMANAGEMENT" && f.status === "ACTIVE");
                if (!hasIt) setIsLocked(true);
            } else {
                setIsLocked(true);
            }
        }).catch(() => {
            setIsLocked(true);
        }).finally(() => {
            setIsCheckingPlan(false);
        });
    }, []);
    */

    const fetchInventory = async (silent = false, stockStatus) => {
        if (!silent) setIsLoading(true);
        try {
            const requestLimit = 100;
            const maxPages = 50;
            let requestedPage = 1;
            let totalPages = 1;
            const collected = [];

            while (requestedPage <= totalPages && requestedPage <= maxPages) {
                const params = { page: requestedPage, limit: requestLimit };
                if (stockStatus === 'in') params.stockStatus = 'in';
                if (stockStatus === 'out') params.stockStatus = 'out';

                const res = await sellerApi.getProducts(params);
                if (!res.data.success) break;

                // Backend returns handleResponse(..., { items, page, limit, total, totalPages })
                const payload = res.data.result || {};
                const rawProducts = Array.isArray(payload.items)
                    ? payload.items
                    : (res.data.results || []);

                collected.push(...rawProducts);
                totalPages = Number(payload.totalPages || 1);

                if (!rawProducts.length || requestedPage >= totalPages) {
                    break;
                }
                requestedPage += 1;
            }

            const safeProducts = Array.isArray(collected) ? collected : [];

            setInventory(
                safeProducts.map(p => {
                    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
                    const computedStock = hasVariants
                        ? p.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
                        : (Number(p.stock) || 0);
                    const threshold = p.lowStockAlert || 5;
                    return {
                        ...p,
                        id: p._id,
                        stock: computedStock,
                        threshold,
                        status:
                            computedStock === 0
                                ? 'Out of Stock'
                                : (computedStock <= threshold ? 'Low Stock' : 'In Stock')
                    };
                })
            );
        } catch (error) {
            toast.error(t("sStock.loadFailed"));
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchHistory = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await sellerApi.getStockHistory();
            if (res.data.success) {
                setHistory(res.data.result || []);
            }
        } catch (error) {
            toast.error(t("sStock.historyFailed"));
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeView === 'inventory') {
            let stockStatusParam;
            if (filterStatus === 'In Stock') stockStatusParam = 'in';
            else if (filterStatus === 'Out of Stock') stockStatusParam = 'out';
            else stockStatusParam = undefined; // All / Low Stock -> no backend filter
            fetchInventory(false, stockStatusParam);
        } else {
            fetchHistory();
        }
    }, [activeView, filterStatus]);

    const stats = useMemo(() => [
        { label: t('sStock.totalInventory'), value: inventory.reduce((acc, item) => acc + item.stock, 0), icon: HiOutlineCube, color: 'text-brand-600', bg: 'bg-brand-50', status: 'All' },
        { label: t('sStock.lowItems'), value: inventory.filter(i => i.stock > 0 && i.stock <= i.threshold).length, icon: HiOutlineExclamationTriangle, color: 'text-amber-600', bg: 'bg-amber-50', status: 'Low Stock' },
        { label: t('status.out_of_stock'), value: inventory.filter(i => i.stock === 0).length, icon: HiOutlineArchiveBoxXMark, color: 'text-rose-600', bg: 'bg-rose-50', status: 'Out of Stock' },
        { label: t('sStock.valuation'), value: `₹${inventory.reduce((acc, item) => acc + (item.stock * item.price), 0).toLocaleString()}`, icon: HiOutlineArrowsUpDown, color: 'text-brand-600', bg: 'bg-brand-50', status: 'In Stock' }
    ], [inventory]);

    const filteredInventory = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return inventory.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(term) ||
                (item.sku || '').toString().toLowerCase().includes(term);
            const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [inventory, searchTerm, filterStatus]);

    const toggleExpand = (id) => {
        setExpandedItems((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleFullAdjustment = async () => {
        const value = parseInt(adjustValue);
        if (isNaN(value) || value <= 0) {
            toast.error(t("sStock.validQty"));
            return;
        }

        try {
            const payload = {
                productId: selectedItem.id,
                type: adjustType === 'Restock' ? 'Restock' : 'Correction',
                quantity: value,
                note: adjustNote
            };

            if (selectedVariant) {
                if (selectedVariant._id) payload.variantId = selectedVariant._id;
                if (selectedVariant.sku) payload.variantSku = selectedVariant.sku;
            }

            const res = await sellerApi.adjustStock(payload);

            if (res.data.success) {
                toast.success(t("sStock.adjusted"));
                setIsAdjustModalOpen(false);
                fetchInventory(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || t("sStock.adjustFailed"));
        }
    };

    const openAdjustModal = (item, variant = null) => {
        setSelectedItem(item);
        if (variant) {
            setSelectedVariant(variant);
        } else if (Array.isArray(item?.variants) && item.variants.length > 0) {
            setSelectedVariant(item.variants[0]);
        } else {
            setSelectedVariant(null);
        }
        setAdjustValue('');
        setAdjustNote('');
        setIsAdjustModalOpen(true);
    };

    if (isCheckingPlan || (isLoading && inventory.length === 0 && history.length === 0)) {
        return <div className="flex items-center justify-center h-screen font-black text-slate-600">{t("sStock.loading")}</div>;
    }

    /* [SUBSCRIPTION DISABLED] "Feature Locked - Buy Subscription" screen
    if (isLocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-6">
                <div className="h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <HiOutlineCube className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">{t("sReturns.featureLocked")}</h2>
                <p className="text-slate-600 max-w-md mx-auto text-sm">
                    {t("sStock.locked")}
                </p>
                <Button onClick={() => navigate('/seller/subscription')} className="px-8 py-3 bg-[#1A4516] hover:bg-[#133A10] text-white">
{t("sWithdraw.buySubscription")}
                </Button>
            </div>
        );
    }
    */

    return (
        <div className="space-y-6 pb-16">
            <BlurFade delay={0.1}>
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
{t("sStock.title")}
                            <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold tracking-wider uppercase bg-amber-100 text-amber-700">
{t("sStock.control")}
                            </Badge>
                        </h1>
                        <p className="text-slate-600 text-sm mt-0.5 font-medium">
{t("sStock.subtitle")}
                        </p>
                    </div>
                </div>
            </BlurFade>

            {activeView === 'inventory' ? (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat, i) => (
                            <BlurFade key={i} delay={0.1 + (i * 0.05)}>
                                <div onClick={() => setFilterStatus(stat.status)} className="cursor-pointer">
                                    <MagicCard
                                        className="border-none shadow-sm ring-1 ring-slate-100 p-0 overflow-hidden group bg-white"
                                        gradientColor="#f8fafc"
                                    >
                                        <div className="flex items-center gap-3 p-4 relative z-10">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm", stat.bg, stat.color)}>
                                                <stat.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest">{stat.label}</p>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
                                            </div>
                                        </div>
                                    </MagicCard>
                                </div>
                            </BlurFade>
                        ))}
                    </div>

                    <BlurFade delay={0.3}>
                        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-3xl">
                            {/* Toolbox */}
                            <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                                    <div className="relative w-full md:w-72">
                                        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                        <Input
                                            placeholder={t("sProducts.searchSkuPh")}
                                            className="pl-10 pr-4 py-2.5 rounded-2xl border-none ring-1 ring-slate-200 bg-white focus:ring-2 focus:ring-primary/20 transition-all text-xs font-semibold"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm">
                                        {['All', 'In Stock', 'Out of Stock'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setFilterStatus(status);
                                                    setPage(1);
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                                    filterStatus === status
                                                        ? "bg-white text-slate-900 shadow-md"
                                                        : "text-slate-600 hover:text-slate-700"
                                                )}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => navigate('/seller/products/add')}
                                        className="rounded-xl px-4 py-2 text-[10px] font-bold shadow-lg shadow-primary/20"
                                    >
                                        <HiOutlinePlus className="h-4 w-4 mr-2" />
{t("sStock.addNewCaps")}
                                    </Button>
                                </div>
                            </div>

                            {/* Stock Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">{t("sStock.productInfo")}</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">{t("sStock.capacity")}</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">{t("sStock.health")}</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">{t("sProducts.price")}</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest text-right whitespace-nowrap">{t("common.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredInventory.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-6 py-10 text-center text-slate-600 text-xs font-black tracking-widest uppercase"
                                                >
{t("sStock.noProducts")}
                                                </td>
                                            </tr>
                                        ) : (
                                            <AnimatePresence>
                                                {filteredInventory
                                                    .slice((page - 1) * pageSize, page * pageSize)
                                                    .map((item) => (
                                                        <React.Fragment key={item.id}>
                                                            <motion.tr
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="group hover:bg-slate-50/80 transition-all cursor-default"
                                                            >
                                                                <td className="px-6 py-5">
                                                                    <div className="flex items-center gap-4 group">
                                                                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform overflow-hidden">
                                                                            {item.mainImage ? (
                                                                                <img src={item.mainImage} alt={item.name} className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <HiOutlineCube className="h-6 w-6" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                                                                                {item.name}
                                                                            </h4>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                                                    Product Code: {item.sku || 'N/A'}
                                                                                </span>
                                                                                {Array.isArray(item.variants) && item.variants.length > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            toggleExpand(item.id);
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                                                    >
                                                                                        <span>{item.variants.length} Variants</span>
                                                                                        {expandedItems[item.id] ? (
                                                                                            <HiOutlineChevronUp className="h-3 w-3" />
                                                                                        ) : (
                                                                                            <HiOutlineChevronDown className="h-3 w-3" />
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex flex-col">
                                                                            <span
                                                                                className={cn(
                                                                                    "text-sm font-black",
                                                                                    item.stock <= item.threshold ? "text-rose-600" : "text-slate-900"
                                                                                )}
                                                                            >
                                                                                {item.stock} units
                                                                            </span>
                                                                            {item.stock <= item.threshold && (
                                                                                <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
{t("status.low_stock")}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <Badge
                                                                        variant={item.status === 'In Stock' ? 'success' : 'destructive'}
                                                                        className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                                                                    >
                                                                        {item.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <p className="text-sm font-black text-slate-900">₹{item.price}</p>
                                                                </td>
                                                                <td className="px-6 py-5 text-right">
                                                                    <button
                                                                        onClick={() => openAdjustModal(item)}
                                                                        className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                                                                    >
{t("sStock.adjustStock")}
                                                                    </button>
                                                                </td>
                                                            </motion.tr>
                                                            {Array.isArray(item.variants) && item.variants.length > 0 && expandedItems[item.id] && (
                                                                <tr className="bg-slate-50/70 border-b border-slate-100">
                                                                    <td colSpan={5} className="py-3 px-6 pl-14">
                                                                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                                                                                    Individual Variants ({item.variants.length})
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-500 font-semibold">
                                                                                    Combined Total: <strong className="text-slate-900">{item.stock} units</strong>
                                                                                </span>
                                                                            </div>
                                                                            <div className="divide-y divide-slate-100">
                                                                                {item.variants.map((v, vIdx) => {
                                                                                    const vStock = Number(v.stock || 0);
                                                                                    const isLow = vStock > 0 && vStock <= item.threshold;
                                                                                    const isOut = vStock === 0;
                                                                                    return (
                                                                                        <div
                                                                                            key={v._id || v.sku || vIdx}
                                                                                            className="py-2.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                                                                                        >
                                                                                            <div className="min-w-[140px]">
                                                                                                <p className="font-bold text-slate-900 text-sm">{v.name}</p>
                                                                                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                                                                                                    SKU: {v.sku || 'N/A'}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="text-left min-w-[90px]">
                                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">{t("sProducts.price")}</span>
                                                                                                <span className="font-bold text-slate-900">
                                                                                                    ₹{v.salePrice && v.salePrice > 0 ? v.salePrice : v.price}
                                                                                                </span>
                                                                                                {v.salePrice && v.salePrice > 0 && (
                                                                                                    <span className="ml-1 text-[10px] text-slate-400 line-through">₹{v.price}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="text-left min-w-[120px]">
                                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block">{t("nav.stock")}</span>
                                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                                    <span className={cn(
                                                                                                        "font-black text-sm",
                                                                                                        isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-700"
                                                                                                    )}>
                                                                                                        {vStock} units
                                                                                                    </span>
                                                                                                    {isOut ? (
                                                                                                        <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
{t("status.out_of_stock")}
                                                                                                        </span>
                                                                                                    ) : isLow ? (
                                                                                                        <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
{t("status.low_stock")}
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
{t("status.in_stock")}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => openAdjustModal(item, v)}
                                                                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-sm active:scale-95"
                                                                                                >
{t("sStock.adjustVariant")}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                            </AnimatePresence>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </BlurFade>

                    <div className="mt-4">
                        <Pagination
                            page={page}
                            totalPages={Math.ceil(filteredInventory.length / pageSize) || 1}
                            total={filteredInventory.length}
                            pageSize={pageSize}
                            onPageChange={(p) => setPage(p)}
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                setPage(1);
                            }}
                            loading={isLoading}
                        />
                    </div>
                </>
            ) : (
                /* History View */
                <BlurFade delay={0.2}>
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl p-0 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                            <div>
                                <h3 className="text-base font-black text-slate-900">{t("sStock.log")}</h3>
                                <p className="text-sm text-slate-600 font-medium">{t("sStock.logBody")}</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {history.length === 0 ? (
                                <div className="p-10 text-center text-slate-600 font-black uppercase tracking-widest">{t("sStock.noHistory")}</div>
                            ) : history.map((log) => (
                                <div key={log._id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm",
                                            log.type === 'Restock' ? "bg-brand-50 text-brand-600" :
                                                log.type === 'Sale' ? "bg-brand-50 text-brand-600" : "bg-rose-50 text-rose-600"
                                        )}>
                                            {log.type === 'Restock' ? <HiOutlinePlus className="h-6 w-6" /> :
                                                log.type === 'Sale' ? <HiOutlineCube className="h-6 w-6" /> : <HiOutlineMinus className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-slate-900">{log.product?.name || 'Unknown Product'}</h4>
                                                <Badge className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0",
                                                    log.type === 'Restock' ? "bg-brand-100 text-brand-700" :
                                                        log.type === 'Sale' ? "bg-brand-100 text-brand-700" : "bg-rose-100 text-rose-700"
                                                )}>
                                                    {t(`sStock.logType.${String(log.type).toLowerCase()}`, { defaultValue: log.type }).toUpperCase()}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-slate-600 font-semibold mt-1">{t('sStock.note')}: {log.note || t('sReturns.na')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn(
                                            "text-lg font-black tracking-tight mb-0.5",
                                            log.quantity > 0 ? "text-brand-600" : "text-rose-600"
                                        )}>
                                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-slate-600">
                                            <HiOutlineCalendarDays className="h-3.5 w-3.5" />
                                            {new Date(log.createdAt).toLocaleDateString(sellerLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })} • {new Date(log.createdAt).toLocaleTimeString(sellerLocale())}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </BlurFade>
            )}

            {/* Advanced Adjustment Modal */}
            <AnimatePresence>
                {isAdjustModalOpen && selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsAdjustModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md relative z-10 bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                                        <HiOutlineArrowsUpDown className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">{t("sStock.adjustInventory")}</h3>
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none mt-1">{t("sStock.updateStock")}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAdjustModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                                    <HiOutlineXMark className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden">
                                        {selectedItem.mainImage ? (
                                            <img src={selectedItem.mainImage} alt="" className="h-full w-full object-cover" />
                                        ) : <HiOutlineCube className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">{selectedItem.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-600">
                                            {selectedVariant ? (
                                                <>
                                                    VARIANT: <span className="text-indigo-600 font-black">{selectedVariant.name}</span>
                                                    {' • '}CURRENT STOCK: <span className="text-slate-900 font-black">{selectedVariant.stock || 0} UNITS</span>
                                                </>
                                            ) : (
                                                <>
                                                    CURRENT STOCK: <span className="text-slate-900 font-black">{selectedItem.stock} UNITS</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {Array.isArray(selectedItem.variants) && selectedItem.variants.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
{t("sStock.selectVariant")}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                            {selectedItem.variants.map((v) => {
                                                const isSelected = selectedVariant && (
                                                    (selectedVariant._id && v._id && selectedVariant._id === v._id) ||
                                                    (selectedVariant.sku && v.sku && selectedVariant.sku === v.sku)
                                                );
                                                return (
                                                    <button
                                                        key={v._id || v.sku}
                                                        type="button"
                                                        onClick={() => setSelectedVariant(v)}
                                                        className={cn(
                                                            "flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all",
                                                            isSelected
                                                                ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-500/20"
                                                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                                        )}
                                                    >
                                                        <span className="font-bold">{v.name}</span>
                                                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-medium">
                                                            <span>SKU: {v.sku || 'N/A'}</span>
                                                            <span className="font-bold text-slate-900">{v.stock || 0} units</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                                        {['Restock', 'Remove'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setAdjustType(type)}
                                                className={cn(
                                                    "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                                    adjustType === type
                                                        ? "bg-white text-slate-900 shadow-md"
                                                        : "text-slate-600 hover:text-slate-600"
                                                )}
                                            >
                                                {t(`sStock.adjType.${type}`)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">{t("sStock.qtyChange")}</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-600">#</div>
                                            <input
                                                type="number"
                                                value={adjustValue}
                                                onChange={(e) => setAdjustValue(e.target.value)}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-2xl font-black text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">{t("sStock.internalNote")}</label>
                                        <textarea
                                            value={adjustNote}
                                            onChange={(e) => setAdjustNote(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none h-20"
                                            placeholder={t("sStock.reasonPh")}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <Button
                                    onClick={() => setIsAdjustModalOpen(false)}
                                    variant="outline"
                                    className="flex-1 py-4 text-xs font-bold rounded-2xl bg-white"
                                >
{t("sEarnings.cancelCaps")}
                                </Button>
                                <Button
                                    onClick={handleFullAdjustment}
                                    className="flex-1 py-4 text-xs font-bold rounded-2xl shadow-xl shadow-primary/20"
                                >
{t("sProducts.saveChanges")}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StockManagement;
