import React, { useState, useEffect } from "react";
import { ChevronRight, Plus, Sparkles, Check, Package as PackageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "../../services/customerApi";
import { useCart } from "../../context/CartContext";
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PackageDetailModal from "../shared/PackageDetailModal";
import { useTranslation } from "react-i18next";
import { getLocalizedItemLabel as itemName } from "../../i18n/format";

const SuperSaverCombos = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addPackageToCart } = useCart();
  const { currentLocation } = useAppLocation();
  const lat = currentLocation?.latitude;
  const lng = currentLocation?.longitude;
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCombos = async () => {
      // Same rule as products: only show combos from sellers serving this location
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (isMounted) {
          setPackages([]);
          setIsLoading(false);
        }
        return;
      }
      try {
        const res = await customerApi.getPackages({ limit: 12, lat, lng });
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
  }, [lat, lng]);

  useEffect(() => {
    if (previewPackage) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.documentElement.style.overflow = "hidden";
      window.__lenis?.stop();
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
      document.documentElement.style.overflow = "unset";
      window.__lenis?.start();
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
      document.documentElement.style.overflow = "unset";
      window.__lenis?.start();
    };
  }, [previewPackage]);

  const handleAddToCart = async (e, pkg) => {
    e.stopPropagation();
    setAddingId(pkg._id);
    try {
      const success = await addPackageToCart(pkg);
      if (success) {
        toast.success(t("combos.addedToCart", { name: itemName(pkg), count: pkg.items?.length || 0 }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t("combos.addFailed"));
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
                  {t("combos.superSaver")}
                </span>
                <span className="text-[10px] font-semibold text-amber-800 opacity-80">
                  {t("combos.curatedPacks")}
                </span>
              </div>
              <h3 className="text-[19px] sm:text-[21px] font-black text-slate-900 tracking-tight uppercase leading-none">
                {t("combos.bachat")} <span className="text-[#1A4516]">{t("combos.combos")}</span>
              </h3>
            </div>

            <button
              onClick={() => navigate("/user/packages")}
              className="flex items-center gap-1 bg-white px-3.5 py-1.5 rounded-full text-[#1A4516] font-bold text-[11px] cursor-pointer shadow-xs border border-amber-300/50 transition-all active:scale-95 hover:bg-amber-50 mb-0.5"
            >
              {t("common.seeAll")}
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>

          {/* Horizontal Card Carousel */}
          <div className="relative z-10 flex overflow-x-auto gap-3 md:gap-4 pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
            {packages.map((pkg) => {
              const itemCount = pkg.items?.length || 0;
              const isAdding = addingId === pkg._id;
              const itemsListPreview = (pkg.items || [])
                .map((it) => itemName(it.productId))
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
                          alt={itemName(pkg)}
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
                          {t("product.percentOff", { percent: pkg.discountPercentage })}
                        </span>
                      )}
                    </div>

                    {/* Title & Items Preview */}
                    <h4 className="font-bold text-slate-900 text-[13px] leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {itemName(pkg)}
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
                        t("product.oos")
                      ) : isAdding ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <>
                          <Plus size={12} strokeWidth={3} />
                          {t("product.add")}
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

      <PackageDetailModal
        pkg={previewPackage}
        isAdding={addingId === previewPackage?._id}
        onClose={() => setPreviewPackage(null)}
        onAddToCart={async (e, pkg) => {
          await handleAddToCart(e, pkg);
          setPreviewPackage(null);
        }}
      />
    </div>
  );
};

export default React.memo(SuperSaverCombos);

