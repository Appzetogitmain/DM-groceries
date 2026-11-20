import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import {
    HiOutlineBars3,
    HiOutlineMagnifyingGlass,
    HiOutlineMicrophone,
    HiOutlinePhoto,
    HiOutlineEyeSlash,
    HiOutlinePencilSquare,
    HiOutlineLockClosed,
    HiOutlineCheck,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

/**
 * Phone-style live preview of a page's experience sections.
 * Sections can be dragged (by the handle) to reorder them; when a drag ends
 * with a new order, `onReorder(newSections)` is called so the parent can save
 * it. The customer app sorts sections by the same saved order.
 */

const flattenTree = (nodes, map = new Map()) => {
    for (const node of nodes || []) {
        if (node?._id) map.set(String(node._id), node);
        if (node?.children?.length) flattenTree(node.children, map);
    }
    return map;
};

const idsOf = (list) => (list || []).map((x) => String(x?._id || x));

const SectionTitle = ({ children }) =>
    children ? (
        <h4 className="px-3 pb-2 text-[11px] font-extrabold text-slate-900 truncate">{children}</h4>
    ) : null;

const CircleGrid = ({ items, max, emptyText }) => {
    const shown = max ? items.slice(0, max) : items;
    if (!shown.length) {
        return <p className="px-3 text-[9px] text-slate-400 italic">{emptyText}</p>;
    }
    return (
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-2 px-3">
            {shown.map((item, i) => (
                <div key={item?._id || i} className="flex flex-col items-center gap-1 min-w-0">
                    <div className="aspect-square w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                        {item?.image ? (
                            <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <HiOutlinePhoto className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                    <span className="w-full text-center text-[7px] font-semibold leading-tight text-slate-700 line-clamp-2">
                        {item?.name || 'Category'}
                    </span>
                </div>
            ))}
        </div>
    );
};

const SectionBody = ({ section, nodeMap, builtinCtx }) => {
    const cfg = section.config || {};

    if (section.displayType === 'builtin') {
        const { heroConfig, shopCategories, isHomePage, pageLabel } = builtinCtx || {};
        switch (section.builtinKey) {
            case 'hero':
                return <HeroBlock heroConfig={heroConfig} />;
            case 'my_list':
                return <MakeYourOwnListBlock />;
            case 'combos':
                return <CombosBlock />;
            case 'shop_by_category':
                return <ShopByCategoryBlock categories={shopCategories || []} />;
            case 'products':
                return isHomePage
                    ? <ProductStripBlock tag="Lowest price" title="Lowest Price" accent="ever" />
                    : <ProductStripBlock tag="Category products" title={pageLabel} />;
            default:
                return null;
        }
    }

    if (section.displayType === 'banners') {
        const items = (cfg.banners?.items || []).filter((b) => b?.imageUrl);
        const first = items[0];
        return (
            <div className="px-3">
                <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-slate-100">
                    {first ? (
                        <img src={first.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-slate-300">
                            <HiOutlinePhoto className="h-6 w-6" />
                            <span className="text-[8px] font-bold mt-1">No banner image</span>
                        </div>
                    )}
                    {items.length > 1 && (
                        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                            {items.slice(0, 6).map((_, i) => (
                                <span
                                    key={i}
                                    className={cn('h-1 rounded-full bg-white/90', i === 0 ? 'w-3' : 'w-1 opacity-60')}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (section.displayType === 'categories') {
        const c = cfg.categories || {};
        const items = idsOf(c.categoryIds).map((id) => nodeMap.get(id)).filter(Boolean);
        return (
            <>
                <SectionTitle>{section.title}</SectionTitle>
                <CircleGrid items={items} max={c.maxItems || (c.rows ? c.rows * 4 : undefined)} emptyText="No categories selected" />
            </>
        );
    }

    if (section.displayType === 'subcategories') {
        const c = cfg.subcategories || {};
        const items = idsOf(c.subcategoryIds).map((id) => nodeMap.get(id)).filter(Boolean);
        return (
            <>
                <SectionTitle>{section.title}</SectionTitle>
                <CircleGrid items={items} max={c.rows ? c.rows * 4 : undefined} emptyText="No subcategories selected" />
            </>
        );
    }

    if (section.displayType === 'products') {
        const p = cfg.products || {};
        const count = idsOf(p.productIds).length;
        const columns = Math.min(Math.max(Number(p.columns) || 2, 1), 4);
        const rows = p.singleRowScrollable ? 1 : Math.max(Number(p.rows) || 1, 1);
        const cards = Math.max(Math.min(count || columns * rows, columns * rows), 1);
        return (
            <>
                <SectionTitle>{section.title}</SectionTitle>
                <div
                    className={cn('px-3 gap-1.5', p.singleRowScrollable ? 'flex overflow-hidden' : 'grid')}
                    style={p.singleRowScrollable ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: p.singleRowScrollable ? Math.max(count, 3) : cards }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                'rounded-lg border border-slate-100 bg-white p-1.5',
                                p.singleRowScrollable && 'w-[30%] shrink-0'
                            )}
                        >
                            <div className="aspect-square rounded-md bg-slate-100" />
                            <div className="mt-1.5 h-1.5 w-4/5 rounded bg-slate-200" />
                            <div className="mt-1 flex items-center justify-between">
                                <div className="h-1.5 w-1/3 rounded bg-slate-200" />
                                <div className="h-3 w-5 rounded border border-primary/40" />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="px-3 pt-1 text-[8px] text-slate-400">
                    {count ? `${count} product${count === 1 ? '' : 's'}` : 'Products from selected categories'}
                </p>
            </>
        );
    }

    return null;
};

/* ---------- Built-in sections (fixed in the app, shown above custom ones) ---------- */

const BuiltInTag = ({ children = 'Built-in' }) => (
    <span
        className="absolute -top-2 left-2 z-10 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[7px] font-black uppercase text-slate-500 shadow ring-1 ring-slate-200"
        title="Built-in app section: can be moved or hidden, not deleted"
    >
        <HiOutlineLockClosed className="h-2.5 w-2.5" /> {children}
    </span>
);

const BuiltInBlock = ({ tag, children, className }) => (
    <div className={cn('relative', className)}>
        <BuiltInTag>{tag}</BuiltInTag>
        {children}
    </div>
);

const HeroBlock = ({ heroConfig }) => {
    const first = (heroConfig?.banners?.items || []).find((b) => b?.imageUrl);
    return (
        <BuiltInBlock tag="Hero banner · mobile only" className="px-1.5">
            {first ? (
                <div className="aspect-[2.2/1] w-full overflow-hidden rounded-lg bg-slate-100">
                    <img src={first.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
            ) : (
                <div className="relative flex h-[78px] items-center overflow-hidden rounded-lg bg-gradient-to-r from-[#1A4516] to-[#256121] p-3">
                    <div className="z-10">
                        <p className="text-[10px] font-bold leading-tight text-white">Fresh Vegetables<br />Big Savings</p>
                        <span className="mt-1.5 inline-block rounded-md bg-white px-2 py-0.5 text-[7px] font-bold text-[#1A4516]">Shop Now</span>
                    </div>
                    <img src="/vegetable-basket-banner.png" alt="" className="absolute -bottom-1 -right-2 h-[110%] w-auto object-contain" />
                </div>
            )}
        </BuiltInBlock>
    );
};

const MakeYourOwnListBlock = () => (
    <BuiltInBlock tag="My List" className="px-1.5">
        <div className="rounded-xl bg-gradient-to-br from-[#12330F] via-[#1A4516] to-[#0E280C] p-3 text-white">
            <span className="text-[6px] font-black uppercase tracking-wider text-emerald-200">Personalized Grocery Baskets</span>
            <p className="text-[11px] font-black leading-tight">Make Your Own Grocery List</p>
            <p className="mt-1 text-[7px] leading-snug text-emerald-100/80">
                Assemble monthly essentials once. Re-order the basket in 1-click!
            </p>
            <div className="mt-2 flex gap-1.5">
                <span className="rounded-md bg-white px-2 py-0.5 text-[7px] font-bold text-[#1A4516]">Create List</span>
                <span className="rounded-md border border-white/30 px-2 py-0.5 text-[7px] font-bold">My Lists</span>
            </div>
        </div>
    </BuiltInBlock>
);

const CombosBlock = () => (
    <BuiltInBlock tag="Combos">
        <div className="border-y border-amber-200/60 bg-gradient-to-br from-[#FEF9E7] via-[#FFFDF5] to-[#FDF8E2] px-3 pb-2.5 pt-3">
            <div className="mb-2 flex items-end justify-between">
                <p className="text-[11px] font-black uppercase leading-none text-slate-900">
                    Bachat <span className="text-[#1A4516]">Combos</span>
                </p>
                <span className="text-[7px] font-bold text-[#1A4516]">See all</span>
            </div>
            <div className="flex gap-1.5 overflow-hidden">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="w-[42%] shrink-0 rounded-lg border border-amber-100 bg-white p-1.5">
                        <div className="aspect-[4/3] rounded-md bg-amber-50" />
                        <div className="mt-1 h-1.5 w-4/5 rounded bg-slate-200" />
                        <div className="mt-1 flex items-center justify-between">
                            <div className="h-1.5 w-1/3 rounded bg-slate-200" />
                            <div className="h-3 w-6 rounded bg-[#1A4516]" />
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-1 text-[7px] text-amber-700/70">Shows your active packages (hidden if none)</p>
        </div>
    </BuiltInBlock>
);

const ShopByCategoryBlock = ({ categories }) => (
    <BuiltInBlock tag="Categories" className="px-3">
        <div className="mb-2 flex items-end justify-between">
            <p className="text-[11px] font-bold leading-none text-[#1A4516]">Shop by Category</p>
            <span className="text-[7px] font-bold text-[#1A4516]">See all</span>
        </div>
        {categories.length ? (
            <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
                {categories.slice(0, 6).map((c) => (
                    <div key={c._id} className="flex flex-col items-center gap-1 min-w-0">
                        <div className="aspect-square w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                            {c.image ? (
                                <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <HiOutlinePhoto className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                        <span className="w-full text-center text-[7px] font-semibold leading-tight text-slate-700 line-clamp-2">{c.name}</span>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-[9px] italic text-slate-400">No categories yet</p>
        )}
    </BuiltInBlock>
);

const ProductStripBlock = ({ tag, title, accent }) => (
    <BuiltInBlock tag={tag}>
        <div className="border-y border-[#1A4516]/10 bg-gradient-to-br from-[#E6F3E6] to-[#F5FBF5] px-3 pb-2.5 pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase leading-none text-[#132018]">
                {title} {accent && <span className="text-[#1A4516]">{accent}</span>}
            </p>
            <div className="flex gap-1.5 overflow-hidden">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="w-[31%] shrink-0 rounded-lg border border-slate-100 bg-white p-1.5">
                        <div className="aspect-square rounded-md bg-slate-100" />
                        <div className="mt-1 h-1.5 w-4/5 rounded bg-slate-200" />
                        <div className="mt-1 flex items-center justify-between">
                            <div className="h-1.5 w-1/3 rounded bg-slate-200" />
                            <div className="h-3 w-5 rounded border border-[#1A4516]/40" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </BuiltInBlock>
);

const DraggableSection = ({ section, index, nodeMap, builtinCtx, onEdit, onDragEnd, disabled }) => {
    const controls = useDragControls();
    const isHidden = section.status !== 'active';

    return (
        <Reorder.Item
            value={section}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
            className="relative list-none"
            whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 12px 30px rgba(15,23,42,0.18)' }}
        >
            <div
                className={cn(
                    'group relative rounded-xl bg-white py-2.5 ring-1 ring-transparent transition-shadow hover:ring-primary/40',
                    isHidden && 'opacity-50'
                )}
            >
                {/* Toolbar shown on hover */}
                <div className="absolute -top-2 right-2 z-10 flex items-center gap-1">
                    {isHidden && (
                        <span className="flex items-center gap-0.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">
                            <HiOutlineEyeSlash className="h-2.5 w-2.5" /> Hidden
                        </span>
                    )}
                    <span className="rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[7px] font-black text-white">
                        #{index + 1}
                    </span>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => onEdit(section)}
                            className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-200 hover:text-primary"
                            title="Edit section"
                        >
                            <HiOutlinePencilSquare className="h-3 w-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            if (disabled) return;
                            e.preventDefault();
                            controls.start(e);
                        }}
                        className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow touch-none',
                            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'
                        )}
                        title="Drag to move"
                        aria-label={`Drag section ${index + 1} to reorder`}
                    >
                        <HiOutlineBars3 className="h-3 w-3" />
                    </button>
                </div>
                <SectionBody section={section} nodeMap={nodeMap} builtinCtx={builtinCtx} />
            </div>
        </Reorder.Item>
    );
};

const ExperiencePreview = ({
    sections,
    headerCategories,
    pageLabel,
    isHomePage = true,
    heroConfig = null,
    onReorder,
    onEdit,
    isSaving = false,
    isDirty = false,
    onSave,
    onDiscard,
}) => {
    const nodeMap = useMemo(() => flattenTree(headerCategories), [headerCategories]);

    // "Shop by Category" uses the page's hero categories, else every category (same as the app)
    const shopCategories = useMemo(() => {
        const fromHero = idsOf(heroConfig?.categoryIds).map((id) => nodeMap.get(id)).filter(Boolean);
        if (fromHero.length) return fromHero;
        return (headerCategories || []).flatMap((h) => h.children || []);
    }, [heroConfig, nodeMap, headerCategories]);

    const builtinCtx = useMemo(
        () => ({ heroConfig, shopCategories, isHomePage, pageLabel }),
        [heroConfig, shopCategories, isHomePage, pageLabel]
    );
    const [items, setItems] = useState(sections);
    const [syncedSections, setSyncedSections] = useState(sections);
    const itemsRef = useRef(sections);

    // Keep in sync with the list on the left (create / delete / arrow reorder)
    if (sections !== syncedSections) {
        setSyncedSections(sections);
        setItems(sections);
    }

    // Latest order for the drag-end handler
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const handleLocalReorder = (next) => {
        itemsRef.current = next;
        setItems(next);
    };

    const handleDragEnd = () => {
        const next = itemsRef.current;
        const changed = next.some((s, i) => s._id !== sections[i]?._id);
        if (changed) onReorder(next);
    };

    return (
        <div className="xl:sticky xl:top-24">
            <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Live Preview</h3>
                <span className="text-[10px] font-bold text-slate-500">
                    Changes the <span className="text-primary">&quot;{pageLabel}&quot;</span> tab in the app
                </span>
            </div>

            {/* Save bar: order changes are a draft until saved */}
            <div
                className={cn(
                    'mx-auto mb-3 flex w-[320px] items-center gap-2 rounded-2xl px-3 py-2 ring-1 transition-colors',
                    isDirty ? 'bg-amber-50 ring-amber-200' : 'bg-emerald-50 ring-emerald-100'
                )}
            >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', isDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
                <span className={cn('flex-1 text-[10px] font-bold', isDirty ? 'text-amber-800' : 'text-emerald-700')}>
                    {isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'All changes saved · live in app'}
                </span>
                {isDirty && (
                    <button
                        type="button"
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white disabled:opacity-50"
                    >
                        Discard
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                >
                    <HiOutlineCheck className="h-3 w-3" />
                    {isSaving ? 'Saving' : 'Save'}
                </button>
            </div>

            {/* Phone frame */}
            <div className="mx-auto w-[320px] rounded-[2.5rem] bg-slate-900 p-2.5 shadow-2xl ring-1 ring-slate-800">
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-50">
                    {/* Notch */}
                    <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900" />

                    {/* App header mock */}
                    <div className="rounded-b-2xl bg-[#2f5d2a] px-3 pb-3 pt-7 text-white">
                        <div className="text-[7px] font-bold uppercase tracking-wider opacity-80">Delivery in</div>
                        <div className="text-[13px] font-extrabold leading-tight">12-15 mins</div>
                        <div className="mt-2 flex h-7 items-center gap-1.5 rounded-lg bg-white px-2 text-slate-500">
                            <HiOutlineMagnifyingGlass className="h-3 w-3" />
                            <span className="flex-1 truncate text-[8px] font-semibold text-slate-700">
                                Search for vegetables, fruits…
                            </span>
                            <HiOutlineMicrophone className="h-3 w-3" />
                        </div>
                        <div className="mt-2 flex gap-1.5 overflow-hidden">
                            <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-black text-[#2f5d2a]">
                                {pageLabel}
                            </span>
                        </div>
                    </div>

                    {/* Sections */}
                    {/* data-lenis-prevent: let this box scroll natively (the page uses Lenis smooth scroll) */}
                    <motion.div
                        layoutScroll
                        data-lenis-prevent
                        data-lenis-prevent-wheel
                        data-lenis-prevent-touch
                        onWheel={(e) => e.stopPropagation()}
                        className="overflow-y-auto overscroll-contain px-1.5 py-3 [scrollbar-width:thin]"
                        style={{ height: 'clamp(360px, calc(100vh - 330px), 600px)' }}
                    >
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-center px-6">
                                <HiOutlinePhoto className="h-7 w-7 text-slate-200" />
                                <p className="mt-2 text-[10px] font-bold text-slate-400">
                                    Sections you add will appear here
                                </p>
                            </div>
                        ) : (
                            <Reorder.Group
                                as="div"
                                axis="y"
                                values={items}
                                onReorder={handleLocalReorder}
                                className="space-y-2.5"
                            >
                                {items.map((section, index) => (
                                    <DraggableSection
                                        key={section._id}
                                        section={section}
                                        index={index}
                                        nodeMap={nodeMap}
                                        builtinCtx={builtinCtx}
                                        onEdit={onEdit}
                                        onDragEnd={handleDragEnd}
                                        disabled={isSaving}
                                    />
                                ))}
                            </Reorder.Group>
                        )}
                    </motion.div>
                </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-400 max-w-[320px] mx-auto">
                Scroll inside the phone. Drag ☰ to move any section, built-in 🔒 ones too, then press <b>Save</b>; customers see the saved order. Built-in sections can only be hidden (✏️ → Inactive), not deleted.
            </p>
        </div>
    );
};

export default ExperiencePreview;
