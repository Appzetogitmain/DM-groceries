import React from "react";
import { Plus, Minus, Lock } from "lucide-react";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

/**
 * CheckoutCartSummary
 *
 * Props:
 *   cart              – array of cart items
 *   onUpdateQuantity  – (id, delta, variantSku) => void
 *   onRemoveFromCart  – (id, variantSku) => void
 *   onMoveToWishlist  – (item) => void
 *   showAll           – boolean (currently unused — all items shown)
 *   onToggleShowAll   – () => void
 */
const CheckoutCartSummary = React.memo(function CheckoutCartSummary({
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onRemovePackage,
  onMoveToWishlist,
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      {cart.map((item) => {
        const isPackageItem = Boolean(item.packageId || item.packagePricePerUnit);
        const packPrice = Number(item.packagePricePerUnit);
        const mrp = Number(item.originalPrice || item.price || 0);
        const sale = Number(item.salePrice || 0);
        const qty = Math.max(0, Number(item.quantity || 0));

        // Use seller's package price if this is a combo item
        const unit = !isNaN(packPrice) && packPrice > 0
          ? packPrice
          : (sale > 0 && sale < mrp ? sale : mrp);
        const total = Math.round(unit * qty);
        const totalMrp = Math.round(mrp * qty);
        const hasDiscount = totalMrp > total;

        return (
          <div
            key={`${item.id}::${String(item.variantSku || "").trim()}::${String(item.packageId || "")}`}
            className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0"
          >
            <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
              <img
                src={applyCloudinaryTransform(item.image)}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 mb-0.5 leading-snug">{item.name}</h4>
              
              {isPackageItem && (
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Combo Pack Price
                  </span>
                  {item.packageName && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={item.packageName}>
                      {item.packageName}
                    </span>
                  )}
                </div>
              )}

              {(item.variantName || item.variantSku) && (
                <p className="text-xs text-slate-500 mb-1">
                  Variant: {item.variantName || item.variantSku}
                </p>
              )}
              
              {isPackageItem ? (
                // Combo items can't be split — removing removes the whole combo.
                onRemovePackage && item.packageId && (
                  <button
                    onClick={() => onRemovePackage(item.packageId)}
                    className="text-xs text-slate-500 underline hover:text-rose-600 transition-colors"
                  >
                    Remove combo
                  </button>
                )
              ) : (
                <button
                  onClick={() => onMoveToWishlist(item)}
                  className="text-xs text-slate-500 underline hover:text-[#1A4516] transition-colors"
                >
                  Move to wishlist
                </button>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {isPackageItem ? (
                // Combo items: quantity is fixed by the package — no +/- controls.
                <div
                  className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5"
                  title="Quantity is fixed for combo pack items"
                >
                  <Lock size={11} className="text-slate-400" />
                  <span className="text-slate-700 font-bold text-xs">Qty {item.quantity}</span>
                </div>
              ) : (
              <div className="flex items-center gap-2 bg-[#1A4516] rounded-lg px-2 py-1 shadow-xs">
                <button
                  onClick={() => {
                    const productId = item.id || item._id;
                    return item.quantity > 1
                      ? onUpdateQuantity(productId, -1, item.variantSku, item.packageId)
                      : onRemoveFromCart(productId, item.variantSku, item.packageId);
                  }}
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="text-white font-bold min-w-[20px] text-center text-xs">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id || item._id, 1, item.variantSku, item.packageId)}
                  className="text-white p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
              )}

              <div className="text-right leading-tight">
                <p className="text-base font-black text-slate-800">₹{total}</p>
                {hasDiscount && (
                  <p className="text-[11px] font-bold text-slate-400 line-through">
                    ₹{totalMrp}
                  </p>
                )}
                {hasDiscount && (
                  <p className="text-[10px] font-bold text-emerald-600">
                    Save ₹{totalMrp - total}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="pt-3 border-t border-slate-100 flex justify-center mt-2">
        <a href="/user" className="flex items-center gap-2 text-[#1A4516] font-bold text-sm hover:underline py-1">
          <Plus size={16} strokeWidth={3} />
          Add more items
        </a>
      </div>
    </div>
  );
});

export default CheckoutCartSummary;
