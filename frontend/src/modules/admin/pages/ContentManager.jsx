import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import Modal from '@shared/components/ui/Modal';
import { useToast } from '@shared/components/ui/Toast';
import {
    HiOutlinePlus,
    HiOutlinePhoto,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineArrowUpCircle,
    HiOutlineArrowDownCircle,
    HiOutlineDevicePhoneMobile,
    HiOutlineLink,
    HiOutlineSparkles,
    HiOutlineXMark,
    HiOutlineLockClosed
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { adminApi } from '../services/adminApi';
import ExperiencePreview from '../components/ExperiencePreview';

const DISPLAY_TYPES = [
    { id: 'banners', label: 'Banners' },
    { id: 'categories', label: 'Categories' },
    { id: 'subcategories', label: 'Sub Categories' },
    { id: 'products', label: 'Products' },
];

// The app's fixed sections (displayType "builtin"): reorder + Active/Inactive only
const BUILTIN_DESCRIPTIONS = {
    hero: 'Top "Shop Now" banner (set in Hero & categories per page). Shown on phones only',
    my_list: '"Make Your Own Grocery List" card',
    combos: 'Bachat Combos (your active packages)',
    shop_by_category: 'Shop by Category grid',
    products: 'Lowest Price products (category products on header pages)',
};

// The "All" header tab in the customer app shows the Home Page sections
const isAllHeader = (h) =>
    String(h?.slug || '').trim().toLowerCase() === 'all' ||
    String(h?.name || '').trim().toLowerCase() === 'all';

const ContentManager = () => {
    const { showToast } = useToast();
    const [searchParams] = useSearchParams();
    // Start on the Home Page: that's the "All" tab customers land on
    const [pageType, setPageType] = useState('home');
    const [headerCategories, setHeaderCategories] = useState([]);
    const [selectedHeaderId, setSelectedHeaderId] = useState('');
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [previewHeroConfig, setPreviewHeroConfig] = useState(null);
    // Section ids in the order last saved on the server (to detect unsaved changes)
    const [savedOrderIds, setSavedOrderIds] = useState([]);

    const [activeTab, setActiveTab] = useState('banners');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        displayType: 'banners',
        title: '',
        status: 'active',
        // banners
        bannerItems: [{ imageUrl: '', title: '', subtitle: '', linkType: 'none', linkValue: '', isUploading: false }],
        // categories
        maxCategories: 4,
        categoryIds: [],
        categoryRows: 1,
        // subcategories
        subCategoryCategoryIds: [],
        subCategoryIds: [],
        subCategoryRows: 1,
        // products
        productCategoryIds: [],
        productSubCategoryIds: [],
        productIds: [],
        productRows: 1,
        productColumns: 2,
        singleRowScrollable: false,
    });

    const bannerFileInputsRef = useRef([]);

    const selectedHeader = useMemo(
        () => headerCategories.find(h => h._id === selectedHeaderId) || null,
        [headerCategories, selectedHeaderId]
    );

    const availableCategories = useMemo(() => {
        if (pageType === 'home') {
            return headerCategories.flatMap((header) => header.children || []);
        }
        return selectedHeader?.children || [];
    }, [headerCategories, pageType, selectedHeader]);

    const loadHeaderCategories = async () => {
        try {
            // Use category tree so that header -> category -> subcategory hierarchy is available
            const res = await adminApi.getCategoryTree();
            if (res.data.success) {
                const tree = res.data.results || res.data.result || [];
                const headers = Array.isArray(tree) ? tree : [];
                setHeaderCategories(headers);
                // "All" is the customer home page (pageType "home"), so it is not a
                // header page here; default to the first real header category.
                const firstHeader = headers.find((h) => !isAllHeader(h));
                if (!selectedHeaderId && firstHeader) {
                    setSelectedHeaderId(firstHeader._id);
                }
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to load header categories', 'error');
        }
    };

    // Hero banner + "Shop by Category" for the preview. Same rule as the app:
    // a header page without its own hero config falls back to the home one.
    const loadPreviewHeroConfig = async (params) => {
        const hasContent = (c) => Boolean(c && (c.banners?.items?.length || c.categoryIds?.length));
        try {
            const res = await adminApi.getHeroConfig(params);
            const config = res.data?.result || res.data?.results || null;
            if (hasContent(config) || params.pageType === 'home') return config;
            const homeRes = await adminApi.getHeroConfig({ pageType: 'home' });
            return homeRes.data?.result || homeRes.data?.results || null;
        } catch {
            return null; // preview falls back to the default banner / all categories
        }
    };

    const loadSections = async () => {
        if (pageType === 'header' && !selectedHeaderId) return;
        setIsLoading(true);
        try {
            const params = { pageType };
            if (pageType === 'header') params.headerId = selectedHeaderId;
            const [res, hero] = await Promise.all([
                adminApi.getExperienceSections(params),
                loadPreviewHeroConfig(params),
            ]);
            const raw = res.data.success ? (res.data.results || res.data.result || res.data) : [];
            const list = Array.isArray(raw) ? raw : [];
            setSections(list);
            setSavedOrderIds(list.map((s) => s._id));
            setPreviewHeroConfig(hero);
        } catch (e) {
            console.error(e);
            showToast('Failed to load experience sections', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHeaderCategories();
    }, []);

    // Apply deep-link from Hero & categories per page (?pageType=home | ?pageType=header&headerId=xxx)
    useEffect(() => {
        const fromUrl = searchParams.get('pageType');
        const headerIdFromUrl = searchParams.get('headerId');
        if (fromUrl === 'home') {
            setPageType('home');
        } else if (fromUrl === 'header' && headerIdFromUrl) {
            setPageType('header');
            setSelectedHeaderId(headerIdFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        loadSections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageType, selectedHeaderId]);

    const resetForm = () => {
        setFormData({
            displayType: 'banners',
            title: '',
            status: 'active',
            bannerItems: [{ imageUrl: '', title: '', subtitle: '', linkType: 'none', linkValue: '', isUploading: false }],
            maxCategories: 4,
            categoryIds: [],
            categoryRows: 1,
            subCategoryCategoryIds: [],
            subCategoryIds: [],
            subCategoryRows: 1,
            productCategoryIds: [],
            productSubCategoryIds: [],
            productIds: [],
            productRows: 1,
            productColumns: 2,
            singleRowScrollable: false,
        });
        setActiveTab('banners');
    };

    const openCreateModal = () => {
        setEditingItem(null);
        resetForm();
        setIsModalOpen(true);
    };

    // Built-in sections (banner, list, combos, categories, products) can only be
    // switched Active/Inactive; they can't be deleted or reconfigured.
    const [builtinEditing, setBuiltinEditing] = useState(null);
    const [builtinStatus, setBuiltinStatus] = useState('active');
    const [isSavingBuiltin, setIsSavingBuiltin] = useState(false);

    const saveBuiltinStatus = async () => {
        if (!builtinEditing) return;
        setIsSavingBuiltin(true);
        try {
            await adminApi.updateExperienceSection(builtinEditing._id, { status: builtinStatus });
            setSections((prev) => prev.map((s) => (s._id === builtinEditing._id ? { ...s, status: builtinStatus } : s)));
            showToast(builtinStatus === 'active' ? 'Section is now visible' : 'Section hidden', 'success');
            setBuiltinEditing(null);
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.message || 'Failed to update section', 'error');
        } finally {
            setIsSavingBuiltin(false);
        }
    };

    const openEditModal = (section) => {
        if (section.displayType === 'builtin') {
            setBuiltinEditing(section);
            setBuiltinStatus(section.status || 'active');
            return;
        }
        setEditingItem(section);
        const { displayType, title, status, config = {} } = section;
        const next = {
            displayType,
            title: title || '',
            status: status || 'active',
            bannerItems: config.banners?.items?.length
                ? config.banners.items.map(b => ({ ...b, isUploading: false }))
                : [{ imageUrl: '', title: '', subtitle: '', linkType: 'none', linkValue: '', isUploading: false }],
            maxCategories: config.categories?.maxItems || 4,
            categoryIds: config.categories?.categoryIds || [],
            categoryRows: config.categories?.rows || 1,
            subCategoryCategoryIds: config.subcategories?.categoryIds || [],
            subCategoryIds: config.subcategories?.subcategoryIds || [],
            subCategoryRows: config.subcategories?.rows || 1,
            productCategoryIds: config.products?.categoryIds || [],
            productSubCategoryIds: config.products?.subcategoryIds || [],
            productIds: config.products?.productIds || [],
            productRows: config.products?.rows || 1,
            productColumns: config.products?.columns || 2,
            singleRowScrollable: !!config.products?.singleRowScrollable,
        };
        setFormData(next);
        setActiveTab(displayType);
        setIsModalOpen(true);
    };

    const handleDeleteSection = async (id) => {
        if (!window.confirm('Are you sure you want to delete this section?')) return;
        try {
            await adminApi.deleteExperienceSection(id);
            showToast('Section deleted', 'success');
            setSections(prev => prev.filter(s => s._id !== id));
            setSavedOrderIds(prev => prev.filter(sid => sid !== id));
        } catch (e) {
            console.error(e);
            showToast('Failed to delete section', 'error');
        }
    };

    const handleSaveSection = async () => {
        const { displayType, title, status } = formData;

        if (['categories', 'subcategories', 'products'].includes(displayType)) {
            if (!title || !title.trim()) {
                showToast('Please enter a heading for this section', 'warning');
                return;
            }
        }

        const basePayload = {
            pageType,
            headerId: pageType === 'header' ? selectedHeaderId : undefined,
            displayType,
            title: title?.trim() || '',
            status,
        };

        let config = {};

        if (displayType === 'banners') {
            if ((formData.bannerItems || []).some(b => b.isUploading)) {
                showToast('Please wait for all banner images to finish uploading', 'warning');
                return;
            }
            const items = (formData.bannerItems || []).filter(b => b.imageUrl);
            if (!items.length) {
                showToast('Please add at least one banner image', 'warning');
                return;
            }
            config = {
                items: items.map(b => ({
                    imageUrl: b.imageUrl,
                    title: b.title,
                    subtitle: b.subtitle,
                    linkType: b.linkType || 'none',
                    linkValue: b.linkValue || '',
                    status: b.status || 'active',
                })),
            };
        } else if (displayType === 'categories') {
            if (!formData.categoryIds?.length) {
                showToast('Please select at least one category', 'warning');
                return;
            }
            config = {
                maxItems: Number(formData.maxCategories) || 1,
                categoryIds: formData.categoryIds,
                rows: Number(formData.categoryRows) || 1,
            };
        } else if (displayType === 'subcategories') {
            if (!formData.subCategoryCategoryIds?.length || !formData.subCategoryIds?.length) {
                showToast('Please select categories and subcategories', 'warning');
                return;
            }
            config = {
                categoryIds: formData.subCategoryCategoryIds,
                subcategoryIds: formData.subCategoryIds,
                rows: Number(formData.subCategoryRows) || 1,
            };
        } else if (displayType === 'products') {
            config = {
                categoryIds: formData.productCategoryIds,
                subcategoryIds: formData.productSubCategoryIds,
                productIds: formData.productIds,
                rows: formData.singleRowScrollable ? 1 : (Number(formData.productRows) || 1),
                columns: Number(formData.productColumns) || 2,
                singleRowScrollable: !!formData.singleRowScrollable,
            };
        }

        const payload = {
            ...basePayload,
            config,
        };

        try {
            if (editingItem) {
                const res = await adminApi.updateExperienceSection(editingItem._id, payload);
                const updated = res.data.result || res.data.results || res.data;
                setSections(prev => prev.map(s => (s._id === editingItem._id ? updated : s)));
                showToast('Section updated', 'success');
            } else {
                const res = await adminApi.createExperienceSection(payload);
                const created = res.data.result || res.data.results || res.data;
                setSections(prev => [...prev, created]);
                // The server also puts new sections at the end, so this isn't an unsaved change
                setSavedOrderIds(prev => [...prev, created._id]);
                showToast('Section created', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.message || 'Failed to save section', 'error');
        }
    };

    // Order changes (drag in the preview or the ↑ ↓ arrows) are a draft until
    // "Save" is pressed; Save writes the order the customer app uses.
    const isOrderDirty = useMemo(
        () => sections.map((s) => s._id).join(',') !== savedOrderIds.join(','),
        [sections, savedOrderIds]
    );

    const saveSectionOrder = async () => {
        if (!isOrderDirty || isSavingOrder) return;
        const next = sections.map((s, idx) => ({ ...s, order: idx }));
        setIsSavingOrder(true);
        try {
            await adminApi.reorderExperienceSections(next.map((s) => ({ id: s._id, order: s.order })));
            setSections(next);
            setSavedOrderIds(next.map((s) => s._id));
            showToast('Layout saved. Customers will see the new order.', 'success');
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.message || 'Failed to save the layout', 'error');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const discardOrderChanges = () => {
        const position = new Map(savedOrderIds.map((id, i) => [id, i]));
        setSections((prev) =>
            [...prev].sort((a, b) => (position.get(a._id) ?? Infinity) - (position.get(b._id) ?? Infinity))
        );
    };

    // Ask before leaving a page that has an unsaved layout
    const confirmDiscardIfDirty = () =>
        !isOrderDirty || window.confirm('You have unsaved layout changes. Discard them?');

    useEffect(() => {
        if (!isOrderDirty) return undefined;
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isOrderDirty]);

    const handleReorder = (direction, section) => {
        const index = sections.findIndex(s => s._id === section._id);
        if (index < 0) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sections.length) return;

        const copy = [...sections];
        const [removed] = copy.splice(index, 1);
        copy.splice(newIndex, 0, removed);
        setSections(copy);
    };

    const updateBannerItem = (idx, changes) => {
        setFormData(prev => {
            const items = [...prev.bannerItems];
            items[idx] = { ...items[idx], ...changes };
            return { ...prev, bannerItems: items };
        });
    };

    const handleBannerFileChange = async (idx, file) => {
        if (!file) return;
        updateBannerItem(idx, { isUploading: true });
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await adminApi.uploadExperienceBanner(fd);
            const url = res.data?.result?.url || res.data?.url;
            if (!url) {
                throw new Error('Upload failed');
            }
            updateBannerItem(idx, { imageUrl: url, isUploading: false });
            showToast('Banner image uploaded', 'success');
        } catch (e) {
            console.error(e);
            updateBannerItem(idx, { isUploading: false });
            showToast('Failed to upload banner image', 'error');
        }
    };

    const addBannerItem = () => {
        setFormData(prev => ({
            ...prev,
            bannerItems: [
                ...prev.bannerItems,
                { imageUrl: '', title: '', subtitle: '', linkType: 'none', linkValue: '', isUploading: false },
            ],
        }));
    };

    const removeBannerItem = (idx) => {
        setFormData(prev => ({
            ...prev,
            bannerItems: prev.bannerItems.filter((_, i) => i !== idx),
        }));
    };

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="ds-h1 flex items-center gap-3">
                        Experience Studio
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </h1>
                    <p className="ds-description">Add and arrange the banners, categories, and products that show in the app.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                    >
                        <HiOutlinePlus className="h-5 w-5" />
                        ADD COMPONENT
                    </button>
                </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 max-w-2xl">
                <strong>Top banners and page categories</strong> are set in &quot;Hero & categories per page&quot; in the sidebar. Use this page to manage the main content below them, like banners, categories, and products.
            </p>

            {/* Scope selectors */}
            <div className="flex flex-wrap gap-4 items-center mt-6">
                <div className="flex p-1.5 bg-slate-100 rounded-xl">
                    {[
                        { id: 'home', label: 'Home Page ("All" tab)' },
                        { id: 'header', label: 'Header Category Pages' },
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => {
                                if (opt.id !== pageType && confirmDiscardIfDirty()) setPageType(opt.id);
                            }}
                            className={cn(
                                "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                pageType === opt.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {pageType === 'header' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Header Category</span>
                        <select
                            value={selectedHeaderId}
                            onChange={(e) => {
                                if (confirmDiscardIfDirty()) setSelectedHeaderId(e.target.value);
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                        >
                            {headerCategories.filter((h) => !isAllHeader(h)).map((h) => (
                                <option key={h._id} value={h._id}>{h.name}</option>
                            ))}
                        </select>
                        <span className="text-[10px] text-slate-400">
                            For &quot;All&quot;, use <button type="button" onClick={() => { if (confirmDiscardIfDirty()) setPageType('home'); }} className="font-bold text-primary underline">Home Page</button>
                        </span>
                    </div>
                )}
            </div>

            {/* Canvas Area: section list (left) + live phone preview (right) */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start mt-6">
                {/* Visual Editor */}
                <div className="space-y-6 min-w-0">
                    {/* Section list */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                                Configured Sections ({sections.length})
                            </h3>
                            {isLoading && (
                                <span className="text-[10px] font-bold text-slate-400">Loading...</span>
                            )}
                        </div>

                        {sections.length === 0 && !isLoading && (
                            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                <HiOutlineSparkles className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    No sections configured yet
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Click &quot;Add Component&quot; to start designing this page.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {sections.map((section, idx) => {
                                const isBuiltin = section.displayType === 'builtin';
                                const displayMeta = isBuiltin
                                    ? { label: 'Built-in' }
                                    : DISPLAY_TYPES.find(d => d.id === section.displayType);
                                return (
                                    <Card key={section._id} className="p-4 border-none shadow-lg ring-1 ring-slate-100 bg-white rounded-xl group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                                {section.displayType === 'banners' && <HiOutlinePhoto className="h-6 w-6" />}
                                                {section.displayType === 'categories' && <HiOutlineSparkles className="h-6 w-6" />}
                                                {section.displayType === 'subcategories' && <HiOutlineSparkles className="h-6 w-6" />}
                                                {section.displayType === 'products' && <HiOutlineDevicePhoneMobile className="h-6 w-6" />}
                                                {isBuiltin && <HiOutlineLockClosed className="h-6 w-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                        #{idx + 1} • {displayMeta?.label || section.displayType}
                                                    </span>
                                                    <Badge
                                                        variant={section.status === 'active' ? 'success' : 'secondary'}
                                                        className="text-[8px] font-black uppercase"
                                                    >
                                                        {section.status}
                                                    </Badge>
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 mb-1">
                                                    {section.title || '(No heading)'}
                                                </h4>
                                                <p className="text-[11px] text-slate-500">
                                                    {isBuiltin && (BUILTIN_DESCRIPTIONS[section.builtinKey] || 'App section')}
                                                    {section.displayType === 'banners' && `${section.config?.banners?.items?.length || 0} banners configured`}
                                                    {section.displayType === 'categories' && `${section.config?.categories?.categoryIds?.length || 0} categories • ${section.config?.categories?.rows || 1} rows`}
                                                    {section.displayType === 'subcategories' && `${section.config?.subcategories?.subcategoryIds?.length || 0} subcategories • ${section.config?.subcategories?.rows || 1} rows`}
                                                    {section.displayType === 'products' && `${section.config?.products?.productIds?.length || 0} products • ${section.config?.products?.rows || 1}x${section.config?.products?.columns || 2}${section.config?.products?.singleRowScrollable ? ' • Single row scroll' : ''}`}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        disabled={idx === 0}
                                                        onClick={() => handleReorder('up', section)}
                                                        className={cn(
                                                            "p-1.5 rounded-xl border text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all",
                                                            idx === 0 && "opacity-30 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <HiOutlineArrowUpCircle className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        disabled={idx === sections.length - 1}
                                                        onClick={() => handleReorder('down', section)}
                                                        className={cn(
                                                            "p-1.5 rounded-xl border text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all",
                                                            idx === sections.length - 1 && "opacity-30 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <HiOutlineArrowDownCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(section)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                    >
                                                        <HiOutlinePencilSquare className="h-5 w-5" />
                                                    </button>
                                                    {isBuiltin ? (
                                                        <span
                                                            className="p-2 text-slate-200 cursor-not-allowed"
                                                            title="Built-in sections can't be deleted. Edit to set Inactive."
                                                        >
                                                            <HiOutlineLockClosed className="h-5 w-5" />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeleteSection(section._id)}
                                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        >
                                                            <HiOutlineTrash className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Live Preview with drag & drop */}
                <ExperiencePreview
                    sections={sections}
                    headerCategories={headerCategories}
                    pageLabel={pageType === 'home' ? 'All' : (selectedHeader?.name || 'Category')}
                    isHomePage={pageType === 'home'}
                    heroConfig={previewHeroConfig}
                    onReorder={setSections}
                    onEdit={openEditModal}
                    isSaving={isSavingOrder}
                    isDirty={isOrderDirty}
                    onSave={saveSectionOrder}
                    onDiscard={discardOrderChanges}
                />
            </div>

            {/* Built-in section: only Active / Inactive */}
            <Modal
                isOpen={Boolean(builtinEditing)}
                onClose={() => setBuiltinEditing(null)}
                title={builtinEditing?.title || 'Built-in section'}
                size="sm"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setBuiltinEditing(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={saveBuiltinStatus}
                            disabled={isSavingBuiltin}
                            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
                        >
                            {isSavingBuiltin ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                        {BUILTIN_DESCRIPTIONS[builtinEditing?.builtinKey] || 'App section'}
                    </p>
                    <div className="flex p-1.5 bg-slate-100 rounded-xl w-fit">
                        {[
                            { id: 'active', label: 'Active (visible)' },
                            { id: 'inactive', label: 'Inactive (hidden)' },
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setBuiltinStatus(opt.id)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-[11px] font-black transition-all',
                                    builtinStatus === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                        <HiOutlineLockClosed className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        Built-in sections can&apos;t be deleted or edited. You can hide them, and drag them in the preview to change their position.
                    </p>
                </div>
            </Modal>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? "Edit Section" : "Create Section"}
            >
                <div className="space-y-6">
                    {/* Display type & status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Type</label>
                            <select
                                value={formData.displayType}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData(prev => ({ ...prev, displayType: value }));
                                    setActiveTab(value);
                                }}
                                className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-black outline-none"
                            >
                                {DISPLAY_TYPES.map(dt => (
                                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-black outline-none"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Heading - required for category/subcategory/product */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Section Heading {['categories', 'subcategories', 'products'].includes(formData.displayType) && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold border-none outline-none ring-1 ring-transparent focus:ring-primary/20 transition-all"
                            placeholder="E.g. Grocery Essentials"
                        />
                    </div>

                    {/* Type-specific config */}
                    {formData.displayType === 'banners' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Banner Items
                                </span>
                                <button
                                    type="button"
                                    onClick={addBannerItem}
                                    className="flex items-center gap-1 text-[10px] font-black text-primary"
                                >
                                    <HiOutlinePlus className="h-3 w-3" />
                                    Add banner
                                </button>
                            </div>
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {formData.bannerItems.map((item, idx) => (
                                    <Card key={idx} className="p-3 bg-white border-slate-100">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.title || `Banner ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <HiOutlinePhoto className="h-6 w-6 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <input
                                                            ref={(el) => {
                                                                bannerFileInputsRef.current[idx] = el;
                                                            }}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) =>
                                                                handleBannerFileChange(idx, e.target.files?.[0])
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                bannerFileInputsRef.current[idx]?.click()
                                                            }
                                                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                                                        >
                                                            {item.imageUrl ? 'Change image' : 'Choose image file'}
                                                        </button>
                                                        <p className="text-[10px] text-slate-400">
                                                            {item.isUploading
                                                                ? 'Uploading...'
                                                                : item.imageUrl
                                                                ? 'Image uploaded'
                                                                : 'PNG, JPG up to 5MB'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <input
                                                    value={item.title || ''}
                                                    onChange={(e) => updateBannerItem(idx, { title: e.target.value })}
                                                    className="w-full p-2.5 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                                                    placeholder="Banner title (optional)"
                                                />
                                                <input
                                                    value={item.subtitle || ''}
                                                    onChange={(e) => updateBannerItem(idx, { subtitle: e.target.value })}
                                                    className="w-full p-2.5 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                                                    placeholder="Subtitle (optional)"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        value={item.linkType || 'none'}
                                                        onChange={(e) => updateBannerItem(idx, { linkType: e.target.value, linkValue: '' })}
                                                        className="w-full p-2.5 bg-slate-50 rounded-xl text-xs font-black outline-none"
                                                    >
                                                        <option value="none">No link</option>
                                                        <option value="category">Category</option>
                                                        <option value="subcategory">Subcategory</option>
                                                        <option value="product">Product</option>
                                                        <option value="url">External URL</option>
                                                    </select>
                                                    {item.linkType && item.linkType !== 'none' && (
                                                        <input
                                                            value={item.linkValue || ''}
                                                            onChange={(e) => updateBannerItem(idx, { linkValue: e.target.value })}
                                                            className="w-full p-2.5 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                                                            placeholder={
                                                                item.linkType === 'product' ? "/product/product-id" :
                                                                item.linkType === 'category' ? "/category/category-name" :
                                                                item.linkType === 'subcategory' ? "/category/subcategory-name" :
                                                                item.linkType === 'url' ? "https://dmgroceries.com/..." :
                                                                "Link"
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            {formData.bannerItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBannerItem(idx)}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <HiOutlineXMark className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.displayType === 'categories' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Categories to show
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.maxCategories ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxCategories: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Rows (4 columns on mobile)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.categoryRows ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, categoryRows: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Choose categories to show
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.map(c => {
                                        const isSelected = formData.categoryIds.includes(c._id);
                                        return (
                                            <button
                                                key={c._id}
                                                type="button"
                                                onClick={() =>
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        categoryIds: isSelected
                                                            ? prev.categoryIds.filter(id => id !== c._id)
                                                            : [...prev.categoryIds, c._id],
                                                    }))
                                                }
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                                                )}
                                            >
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Pick the categories you want to show. One row displays 4 categories.
                                </p>
                            </div>
                        </div>
                    )}

                    {formData.displayType === 'subcategories' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Parent categories
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {(selectedHeader?.children || []).map(c => {
                                        const isSelected = formData.subCategoryCategoryIds.includes(c._id);
                                        return (
                                            <button
                                                key={c._id}
                                                type="button"
                                                onClick={() =>
                                                    setFormData(prev => {
                                                        const alreadySelected = prev.subCategoryCategoryIds.includes(c._id);
                                                        let nextCategoryIds;
                                                        let nextSubCategoryIds = prev.subCategoryIds;

                                                        if (alreadySelected) {
                                                            nextCategoryIds = prev.subCategoryCategoryIds.filter(id => id !== c._id);
                                                            const childIds = (c.children || []).map(child => child._id);
                                                            nextSubCategoryIds = prev.subCategoryIds.filter(
                                                                id => !childIds.includes(id)
                                                            );
                                                        } else {
                                                            nextCategoryIds = [...prev.subCategoryCategoryIds, c._id];
                                                        }

                                                        return {
                                                            ...prev,
                                                            subCategoryCategoryIds: nextCategoryIds,
                                                            subCategoryIds: nextSubCategoryIds,
                                                        };
                                                    })
                                                }
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                                                )}
                                            >
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Subcategories
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {(selectedHeader?.children || [])
                                        .filter(c => formData.subCategoryCategoryIds.includes(c._id))
                                        .flatMap(c => c.children || [])
                                        .map(s => {
                                        const isSelected = formData.subCategoryIds.includes(s._id);
                                        return (
                                            <button
                                                key={s._id}
                                                type="button"
                                                onClick={() =>
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        subCategoryIds: isSelected
                                                            ? prev.subCategoryIds.filter(id => id !== s._id)
                                                            : [...prev.subCategoryIds, s._id],
                                                    }))
                                                }
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                                                )}
                                            >
                                                {s.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Displayed in 4-column grids per row.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Rows
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={formData.subCategoryRows ?? ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subCategoryRows: e.target.value === '' ? '' : Number(e.target.value) }))}
                                    className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {formData.displayType === 'products' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Rows
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        disabled={formData.singleRowScrollable}
                                        value={formData.productRows ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, productRows: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Columns
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.productColumns ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, productColumns: e.target.value === '' ? '' : Number(e.target.value) }))}
                                        className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold border-none outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="singleRowScrollable"
                                    type="checkbox"
                                    checked={formData.singleRowScrollable}
                                    onChange={(e) => setFormData(prev => ({ ...prev, singleRowScrollable: e.target.checked }))}
                                />
                                <label htmlFor="singleRowScrollable" className="text-[11px] font-bold text-slate-600">
                                    Show products in a single horizontally scrollable row
                                </label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Filter by categories / subcategories (optional)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-wrap gap-2">
                                        {(selectedHeader?.children || []).map(c => {
                                            const isSelected = formData.productCategoryIds.includes(c._id);
                                            return (
                                                <button
                                                    key={c._id}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData(prev => {
                                                            const alreadySelected = prev.productCategoryIds.includes(c._id);
                                                            let nextCategoryIds;
                                                            let nextSubCategoryIds = prev.productSubCategoryIds;

                                                            if (alreadySelected) {
                                                                nextCategoryIds = prev.productCategoryIds.filter(id => id !== c._id);
                                                                const childIds = (c.children || []).map(child => child._id);
                                                                nextSubCategoryIds = prev.productSubCategoryIds.filter(
                                                                    id => !childIds.includes(id)
                                                                );
                                                            } else {
                                                                nextCategoryIds = [...prev.productCategoryIds, c._id];
                                                            }

                                                            return {
                                                                ...prev,
                                                                productCategoryIds: nextCategoryIds,
                                                                productSubCategoryIds: nextSubCategoryIds,
                                                            };
                                                        })
                                                    }
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                                                    )}
                                                >
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(selectedHeader?.children || [])
                                            .filter(c => formData.productCategoryIds.includes(c._id))
                                            .flatMap(c => c.children || [])
                                            .map(s => {
                                                const isSelected = formData.productSubCategoryIds.includes(s._id);
                                                return (
                                                    <button
                                                        key={s._id}
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                productSubCategoryIds: isSelected
                                                                    ? prev.productSubCategoryIds.filter(id => id !== s._id)
                                                                    : [...prev.productSubCategoryIds, s._id],
                                                            }))
                                                        }
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                                                        )}
                                                    >
                                                        {s.name}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    You can later extend this to select specific products.
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSaveSection}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {editingItem ? 'SAVE CHANGES' : 'PUBLISH SECTION'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ContentManager;
