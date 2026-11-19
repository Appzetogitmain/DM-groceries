import React, { useEffect, useMemo, useState } from "react";
import { X, ArrowLeft, Package as PackageIcon, Clock, ShoppingBag, Store, Layers, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

const unitComboPrice = (it) => Number(it?.packagePricePerUnit || it?.priceAtAddition || 0);
const formatMoney = (n) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? v : v.toFixed(2);
};

/**
 * Combo / package detail view. Layout mirrors the product detail sheet:
 * desktop = wide two-column card (gallery left, details right);
 * mobile  = bottom sheet with sticky Add-to-cart bar.
 */
const PackageDetailModal = ({ pkg, onClose, onAddToCart, isAdding = false }) => {
  const images = useMemo(() => {
    if (!pkg) return [];
    const list = [pkg.coverImage, ...(pkg.galleryImages || [])];
    (pkg.items || []).forEach((it) => list.push(it?.productId?.mainImage));
    return [...new Set(list.filter(Boolean))];
  }, [pkg]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showDescription, setShowDescription] = useState(true);

  useEffect(() => {
    setActiveIndex(0);
    setShowDescription(true);
  }, [pkg?._id]);

  // Close on Escape
  useEffect(() => {
    if (!pkg) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pkg, onClose]);

  if (!pkg) return null;

  const items = pkg.items || [];
  const price = Number(pkg.packagePrice || 0);
  const original = Number(pkg.originalTotalPrice || 0);
  const savings = Math.max(0, original - price);
  const discount = Number(pkg.discountPercentage || 0);
  const isOutOfStock = Number(pkg.stock) <= 0;
  const activeImage = images[activeIndex];

  const handleAdd = (e) => {
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;
    onAddToCart?.(e, pkg);
  };

  const AddButton = ({ className }) => (
    <button
      onClick={handleAdd}
      disabled={isOutOfStock || isAdding}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wide transition-all active:scale-95 shadow-md",
        isOutOfStock
          ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
          : "bg-[#1A4516] hover:bg-[#143711] text-white disabled:opacity-70",
        className,
      )}
    >
      {isOutOfStock ? (
        "Out of Stock"
      ) : (
        <>
          <ShoppingBag size={16} strokeWidth={2.5} />
          {isAdding ? "Adding..." : "Add to Cart"}
        </>
      )}
    </button>
  );

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label={pkg.name}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full md:max-w-5xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] md:h-[min(560px,88vh)]"
      >
        {/* ── Left: gallery ── */}
        <div className="relative md:w-1/2 bg-slate-50 flex shrink-0">
          {/* Vertical thumbnails (desktop) */}
          {images.length > 1 && (
            <div className="hidden md:flex flex-col gap-2.5 p-3 pt-16 overflow-y-auto no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "h-12 w-12 rounded-lg overflow-hidden bg-white border-2 shrink-0 transition-all",
                    idx === activeIndex ? "border-[#1A4516] shadow-sm" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={applyCloudinaryTransform(img, "f_auto,q_auto,w_120")} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 flex items-center justify-center h-[240px] sm:h-[300px] md:h-auto p-4 md:p-10">
            {activeImage ? (
              <img
                src={applyCloudinaryTransform(activeImage, "f_auto,q_auto,w_800")}
                alt={pkg.name}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            ) : (
              <PackageIcon className="h-24 w-24 text-amber-500/60" />
            )}

            {/* Back (desktop) / close (mobile) */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={18} className="hidden md:block" />
              <X size={18} className="md:hidden" />
            </button>

            {discount > 0 && (
              <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1A4516] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                {discount}% OFF
              </span>
            )}

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Image ${idx + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      idx === activeIndex ? "w-6 bg-[#1A4516]" : "w-1.5 bg-slate-300",
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: details ── */}
        <div data-lenis-prevent className="md:w-1/2 flex flex-col min-h-0 flex-1">
          <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-5 md:p-7">
            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                <Clock size={11} /> 8-15 mins
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-200 bg-amber-50 text-[10px] font-black uppercase tracking-wide text-amber-800">
                <Layers size={11} /> Combo · {items.length} items
              </span>
              {savings > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-orange-200 bg-orange-50 text-[10px] font-black uppercase tracking-wide text-orange-700">
                  Save ₹{formatMoney(savings)}
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">{pkg.name}</h2>
            {pkg.sellerId?.shopName && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <Store size={12} /> {pkg.sellerId.shopName}
              </p>
            )}

            {/* Price card */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white p-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-black text-[#1A4516]">₹{formatMoney(price)}</span>
                  {original > price && (
                    <span className="text-sm font-bold text-slate-400 line-through">₹{formatMoney(original)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {discount > 0 && (
                    <span className="text-[10px] font-black uppercase bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                      {discount}% OFF
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-400">Inclusive of all taxes</span>
                </div>
              </div>
              <AddButton className="hidden md:flex px-6 py-3 text-xs" />
            </div>

            {/* Items in this pack */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                Items in this pack ({items.length})
              </h4>
              <div className="space-y-2">
                {items.map((it, idx) => {
                  const prod = it.productId || {};
                  const unit = unitComboPrice(it);
                  const qty = Number(it.quantity || 1);
                  const regular = Number(it.originalPrice || 0);
                  const lineSave = regular > unit ? (regular - unit) * qty : 0;
                  return (
                    <div key={prod._id || idx} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-2.5">
                      <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                        {prod.mainImage ? (
                          <img src={applyCloudinaryTransform(prod.mainImage, "f_auto,q_auto,w_120")} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <PackageIcon size={18} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{prod.name || "Product"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {prod.weight || prod.unit ? <>{prod.weight || prod.unit} · </> : null}
                          Qty <strong className="text-slate-700">{qty}</strong>
                          {regular > unit && (
                            <> · <span className="line-through">₹{formatMoney(regular)}</span></>
                          )}
                          {unit > 0 && (
                            <> · <span className="font-semibold text-emerald-700">₹{formatMoney(unit)}</span></>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-800">₹{formatMoney(unit * qty)}</p>
                        {lineSave > 0 && (
                          <p className="text-[10px] font-bold text-emerald-600">Save ₹{formatMoney(lineSave)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            {pkg.description && (
              <div className="mt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowDescription((s) => !s)}
                  className="w-full flex items-center justify-between py-4 text-left"
                >
                  <span className="flex items-center gap-3 text-xs font-black uppercase tracking-wider text-slate-800">
                    <span className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                      <Clock size={15} />
                    </span>
                    Combo Description
                  </span>
                  <ChevronDown size={16} className={cn("text-slate-400 transition-transform", showDescription && "rotate-180")} />
                </button>
                {showDescription && (
                  <p className="pb-4 text-sm text-slate-500 leading-relaxed whitespace-pre-line">{pkg.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Sticky mobile CTA */}
          <div className="md:hidden border-t border-slate-100 p-4 flex items-center justify-between gap-3 bg-white">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900">₹{formatMoney(price)}</span>
                {original > price && (
                  <span className="text-xs text-slate-400 line-through">₹{formatMoney(original)}</span>
                )}
              </div>
              {savings > 0 && <span className="text-[10px] font-bold text-emerald-600">You save ₹{formatMoney(savings)}</span>}
            </div>
            <AddButton className="px-6 py-3 text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailModal;
