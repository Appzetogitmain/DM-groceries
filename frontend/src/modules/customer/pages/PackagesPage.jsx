import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Sparkles,
  Search,
  Package as PackageIcon,
  Plus,
  Check,
  X,
  Filter,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PackagesPage = () => {
  const navigate = useNavigate();
  const { addPackageToCart } = useCart();
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("all"); // 'all' | 'under200' | 'under500' | 'above500'
  const [previewPackage, setPreviewPackage] = useState(null);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    const fetchAllPackages = async () => {
      setIsLoading(true);
      try {
        const res = await customerApi.getPackages({ limit: 50 });
        if (res.data?.success) {
          const list =
            res.data.result?.packages ||
            res.data.result?.items ||
            res.data.results ||
            res.data.result ||
            [];
          setPackages(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        toast.error("Failed to load packages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPackages();
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

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = pkg.name?.toLowerCase().includes(q);
        const matchesDesc = pkg.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      const price = Number(pkg.packagePrice) || 0;
      if (priceFilter === "under200") return price <= 200;
      if (priceFilter === "under500") return price <= 500;
      if (priceFilter === "above500") return price > 500;

      return true;
    });
  }, [packages, searchTerm, priceFilter]);

  return (
    <div className="min-h-screen bg-[#F5F7F8] pt-[190px] md:pt-[205px] pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft size={16} />
            Back to Shopping
          </button>
        </div>

        {/* Hero Banner Header */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#1A4516] via-[#245D1F] to-[#154411] p-6 md:p-8 text-white shadow-xl overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm mb-3">
              <Sparkles size={12} />
              Bachat Combos & Value Packs
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Curated Grocery Combos, Extra Savings
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-2 font-medium">
              Save more when you buy essentials together. Each package is packed fresh by your local seller.
            </p>
          </div>
        </div>

        {/* Search & Price Filter Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search combos by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setPriceFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                priceFilter === "all"
                  ? "bg-[#1A4516] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All Combos
            </button>
            <button
              onClick={() => setPriceFilter("under200")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                priceFilter === "under200"
                  ? "bg-[#1A4516] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Under ₹200
            </button>
            <button
              onClick={() => setPriceFilter("under500")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                priceFilter === "under500"
                  ? "bg-[#1A4516] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Under ₹500
            </button>
            <button
              onClick={() => setPriceFilter("above500")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap",
                priceFilter === "above500"
                  ? "bg-[#1A4516] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Above ₹500
            </button>
          </div>
        </div>

        {/* Packages Grid */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Bachat Combos...</p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <PackageIcon className="h-16 w-16 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Combos Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || priceFilter !== "all"
                ? "No packages match your search or filter. Try clearing filters."
                : "Check back soon! Sellers are assembling exciting new value combos."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filteredPackages.map((pkg) => {
              const itemCount = pkg.items?.length || 0;
              const isAdding = addingId === pkg._id;
              const savings = Math.max(0, (pkg.originalTotalPrice || 0) - (pkg.packagePrice || 0));

              return (
                <div
                  key={pkg._id}
                  onClick={() => setPreviewPackage(pkg)}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] p-3 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all group"
                >
                  <div>
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 mb-2.5 border border-slate-100">
                      {pkg.coverImage ? (
                        <img
                          src={pkg.coverImage}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-600">
                          <PackageIcon className="h-10 w-10 opacity-70" />
                        </div>
                      )}

                      <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                        {itemCount} Items
                      </span>

                      {pkg.discountPercentage > 0 && (
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                          {pkg.discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {pkg.name}
                    </h4>

                    {pkg.sellerId?.shopName && (
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        By {pkg.sellerId.shopName}
                      </p>
                    )}
                  </div>

                  {/* Pricing and Button */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-sm sm:text-base text-slate-900">
                          ₹{pkg.packagePrice}
                        </span>
                        {pkg.originalTotalPrice > pkg.packagePrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{pkg.originalTotalPrice}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block leading-none">
                        Save ₹{savings}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, pkg)}
                      disabled={isAdding || pkg.stock <= 0}
                      className={cn(
                        "h-8 px-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all active:scale-90 shadow-xs",
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
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <>
                          <Plus size={14} strokeWidth={3} />
                          ADD
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK VIEW MODAL */}
      {previewPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewPackage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
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

export default PackagesPage;

