import React, { useState, useEffect } from "react";
import { ChevronRight, Plus, Sparkles, X, Check, Package as PackageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "../../services/customerApi";
import { useCart } from "../../context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SuperSaverCombos = () => {
  const navigate = useNavigate();
  const { addPackageToCart } = useCart();
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCombos = async () => {
      try {
        const res = await customerApi.getPackages({ limit: 12 });
        if (res.data?.success && isMounted) {
          const list =
            res.data.result?.packages ||
            res.data.result?.items ||
            res.data.results ||
            res.data.result ||
            [];
          setPackages(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        // Silently fail without interrupting home screen
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCombos();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddToCart = async (e, pkg) => {
    e.stopPropagation();
    setAddingId(pkg._id);
    try {
      const success = await addPackageToCart(pkg);
      if (success) {
        toast.success(`Added "${pkg.name}" (${pkg.items?.length || 0} items) to your cart!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add combo to cart");
    } finally {
      setTimeout(() => setAddingId(null), 600);
    }
  };

  if (!isLoading && packages.length === 0) {
    return null; // Don't render empty section
  }

  return (
    <div className="w-full mt-2 mb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FEF9E7] via-[#FFFDF5] to-[#FDF8E2] pt-4 pb-3 border-y border-amber-200/50 shadow-sm">
        {/* Soft Decorative Ambient Circles */}
        <div className="absolute -top-10 -right-10 h-44 w-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-44 w-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-full px-4 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-end mb-3.5 px-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                  <Sparkles size={10} />
                  Super Saver
                </span>
                <span className="text-[10px] font-semibold text-amber-800 opacity-80">
                  Curated Packs
                </span>
              </div>
              <h3 className="text-[19px] sm:text-[21px] font-black text-slate-900 tracking-tight uppercase leading-none">
                Bachat <span className="text-[#1A4516]">Combos</span>
              </h3>
            </div>

            <button
              onClick={() => navigate("/user/packages")}
              className="flex items-center gap-1 bg-white px-3.5 py-1.5 rounded-full text-[#1A4516] font-bold text-[11px] cursor-pointer shadow-xs border border-amber-300/50 transition-all active:scale-95 hover:bg-amber-50 mb-0.5"
            >
              See all
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>

          {/* Horizontal Card Carousel */}
          <div className="relative z-10 flex overflow-x-auto gap-3 md:gap-4 pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
            {packages.map((pkg) => {
              const itemCount = pkg.items?.length || 0;
              const isAdding = addingId === pkg._id;
              const itemsListPreview = (pkg.items || [])
                .map((it) => it.productId?.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ");

              return (
                <div
                  key={pkg._id}
                  onClick={() => setPreviewPackage(pkg)}
                  className="w-[170px] sm:w-[190px] md:w-[210px] shrink-0 snap-start bg-white rounded-2xl border border-amber-200/60 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.12)] p-2.5 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Image Container with Floating Badges */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 mb-2 border border-slate-100">
                      {pkg.coverImage ? (
                        <img
                          src={pkg.coverImage}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600">
                          <PackageIcon className="h-10 w-10 opacity-70" />
                        </div>
                      )}

                      {/* Items Pill */}
                      <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        {itemCount} Items
                      </span>

                      {/* Discount Pill */}
                      {pkg.discountPercentage > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                          {pkg.discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    {/* Title & Items Preview */}
                    <h4 className="font-bold text-slate-900 text-[13px] leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {pkg.name}
                    </h4>
                    {itemsListPreview && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {itemsListPreview}
                        {itemCount > 3 ? "..." : ""}
                      </p>
                    )}
                  </div>

                  {/* Pricing & Add Button */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-[15px] text-slate-900">
                          ₹{pkg.packagePrice}
                        </span>
                        {pkg.originalTotalPrice > pkg.packagePrice && (
                          <span className="text-[11px] text-slate-400 line-through">
                            ₹{pkg.originalTotalPrice}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block leading-none">
                        Save ₹{Math.max(0, pkg.originalTotalPrice - pkg.packagePrice)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, pkg)}
                      disabled={isAdding || pkg.stock <= 0}
                      className={cn(
                        "h-7 px-3 rounded-lg font-black text-[11px] flex items-center justify-center gap-1 transition-all active:scale-90 shadow-xs",
                        pkg.stock <= 0
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isAdding
                          ? "bg-emerald-700 text-white"
                          : "bg-[#1A4516] hover:bg-[#143711] text-white"
                      )}
                    >
                      {pkg.stock <= 0 ? (
                        "OOS"
                      ) : isAdding ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <>
                          <Plus size={12} strokeWidth={3} />
                          ADD
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK VIEW / DETAIL MODAL */}
      {previewPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewPackage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div className="relative aspect-[16/9] w-full bg-slate-100">
              {previewPackage.coverImage ? (
                <img
                  src={previewPackage.coverImage}
                  alt={previewPackage.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600">
                  <PackageIcon className="h-16 w-16 opacity-60" />
                </div>
              )}
              <button
                onClick={() => setPreviewPackage(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X size={16} />
              </button>

              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 shadow-sm">
                Save ₹{Math.max(0, previewPackage.originalTotalPrice - previewPackage.packagePrice)} ({previewPackage.discountPercentage}% OFF)
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {previewPackage.name}
                </h3>
                {previewPackage.sellerId?.shopName && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sold by <span className="font-semibold text-slate-700">{previewPackage.sellerId.shopName}</span>
                  </p>
                )}
                {previewPackage.description && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {previewPackage.description}
                  </p>
                )}
              </div>

              {/* Child Products List */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Items in this Pack ({previewPackage.items?.length || 0})
                </p>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1 border border-slate-100 rounded-xl">
                  {(previewPackage.items || []).map((it, idx) => {
                    const prod = it.productId || {};
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 text-xs bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          {prod.mainImage ? (
                            <img
                              src={prod.mainImage}
                              alt={prod.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                              <PackageIcon size={14} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 line-clamp-1">{prod.name || "Product"}</p>
                            <p className="text-[10px] text-slate-400">
                              Qty: <strong className="text-slate-700">{it.quantity}x</strong>
                              {it.originalPrice > (it.packagePricePerUnit || it.priceAtAddition) && (
                                <> • Regular: <span className="line-through">₹{it.originalPrice}</span></>
                              )}
                              {(it.packagePricePerUnit || it.priceAtAddition) && (
                                <> • Combo: <span className="font-semibold text-emerald-700">₹{it.packagePricePerUnit || it.priceAtAddition}</span></>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">
                            ₹{Number((it.packagePricePerUnit || it.priceAtAddition) * it.quantity).toFixed(2)}
                          </span>
                          {it.originalPrice > (it.packagePricePerUnit || it.priceAtAddition) && (
                            <span className="text-[9px] font-bold text-emerald-600 block">
                              Save ₹{Number((it.originalPrice - (it.packagePricePerUnit || it.priceAtAddition)) * it.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Add to Cart CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900">
                      ₹{previewPackage.packagePrice}
                    </span>
                    {previewPackage.originalTotalPrice > previewPackage.packagePrice && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{previewPackage.originalTotalPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Inclusive of all taxes</span>
                </div>

                <button
                  onClick={(e) => {
                    handleAddToCart(e, previewPackage);
                    setPreviewPackage(null);
                  }}
                  disabled={previewPackage.stock <= 0}
                  className="px-6 py-2.5 rounded-xl bg-[#1A4516] hover:bg-[#143711] text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {previewPackage.stock <= 0 ? "Out of Stock" : "Add Combo to Cart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SuperSaverCombos);

