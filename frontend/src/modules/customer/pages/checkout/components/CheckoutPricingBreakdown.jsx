import React from "react";
import { Clipboard, Tag, Heart, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

/**
 * CheckoutPricingBreakdown
 *
 * Props:
 *   pricingPreview    – breakdown object from the preview API (or null)
 *   isPreviewLoading  – boolean
 *   selectedTip       – number
 *   onSelectTip       – (value) => void
 *   tipAmounts        – array of { value, label }
 *   walletAmountToUse – number
 *   finalAmountToPay  – number
 *   cartTotal         – number (fallback when preview is loading)
 *   selectedCoupon    – coupon object or null
 *   discountAmount    – number
 */
const CheckoutPricingBreakdown = React.memo(function CheckoutPricingBreakdown({
  pricingPreview,
  isPreviewLoading,
  previewError,
  selectedTip,
  onSelectTip,
  tipAmounts,
  walletAmountToUse,
  finalAmountToPay,
  cartTotal,
  selectedCoupon,
  discountAmount,
}) {
  const { t } = useTranslation();
  const deliveryFee = pricingPreview?.deliveryFeeCharged || 0;
  const handlingFee = pricingPreview?.handlingFeeCharged || 0;
  const tipAmount = pricingPreview?.tipTotal || selectedTip || 0;
  const taxAmount = pricingPreview?.taxTotal || 0;

  return (
    <>
      {/* Tip for Partner */}
      <motion.div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-100">
        <div className="flex items-center gap-2 mb-3">
          <Heart size={18} className="text-pink-500 fill-pink-500" />
          <h3 className="font-black text-slate-800">{t("checkout.tipPartner")}</h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">{t("checkout.tipGoesToThem")}</p>
        <div className="grid grid-cols-4 gap-2">
          {tipAmounts.map((tip) => (
            <button
              key={tip.value}
              onClick={() => onSelectTip(tip.value)}
              className={`py-2 rounded-xl border-2 transition-all font-bold text-sm ${
                selectedTip === tip.value
                  ? "border-pink-500 bg-pink-100 text-pink-700"
                  : "border-pink-200 bg-white text-slate-700 hover:border-pink-300"
              }`}>
              {tip.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bill Details */}
      <motion.div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-[#F5FBF5] flex items-center justify-center">
            <Clipboard size={20} className="text-[#1A4516]" />
          </div>
          <h3 className="font-[1000] text-slate-800 text-xl tracking-tight uppercase">
            {t("checkout.orderSummary")}
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-slate-500 font-bold text-[13px] uppercase tracking-wider">
              {t("checkout.itemTotal")}
            </span>
            <span className="font-black text-slate-800">
              ₹{pricingPreview?.productSubtotal ?? cartTotal}
            </span>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-slate-500 font-bold text-[13px] uppercase tracking-wider flex items-center gap-1.5">
              {t("checkout.deliveryFee")}
              {pricingPreview?.isFreeDelivery && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  {t("checkout.free")}
                </span>
              )}
            </span>
            <div className="text-right">
              {pricingPreview?.isFreeDelivery && (pricingPreview?.originalDeliveryFee || 0) > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 line-through font-bold">
                    ₹{pricingPreview.originalDeliveryFee}
                  </span>
                  <span className="font-black text-emerald-600">{t("common.free")}</span>
                </div>
              ) : deliveryFee === 0 ? (
                <span className="font-black text-emerald-600">{t("common.free")}</span>
              ) : (
                <span className="font-black text-slate-800">₹{deliveryFee}</span>
              )}
            </div>
          </div>
          {pricingPreview?.isFreeDelivery && (pricingPreview?.freeDeliveryThreshold || 0) > 0 && (
            <div className="px-2 -mt-2 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>🎉 {t("checkout.freeDeliveryUnlocked", { amount: pricingPreview.freeDeliveryThreshold })}</span>
            </div>
          )}
          {pricingPreview &&
            typeof pricingPreview.distanceKmActual === "number" &&
            typeof pricingPreview.distanceKmRounded === "number" && (
              <div className="px-2 -mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>
                  {t("checkout.distance", { km: pricingPreview.distanceKmActual.toFixed(2) })}
                  {pricingPreview.distanceKmRounded
                    ? ` ${t("checkout.billedKm", { km: pricingPreview.distanceKmRounded.toFixed(2) })}`
                    : ""}
                </span>
              </div>
            )}
          <div className="flex justify-between items-center px-2">
            <span className="text-slate-500 font-bold text-[13px] uppercase tracking-wider">
              {t("checkout.handlingFee")}
            </span>
            <span className="font-black text-slate-800">₹{handlingFee}</span>
          </div>


          {selectedCoupon && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center px-3 py-2 bg-[#F5FBF5] rounded-xl border border-[#1A4516]/10">
              <span className="text-[#1A4516] font-black text-xs flex items-center gap-2 uppercase tracking-wider">
                <Tag size={14} />
                {t("checkout.couponReserved")}
              </span>
              <span className="font-black text-[#1A4516]">-₹{discountAmount}</span>
            </motion.div>
          )}

          {tipAmount > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-pink-50 rounded-xl border border-pink-100 italic">
              <span className="text-pink-600 font-bold text-xs flex items-center gap-2">
                <Heart size={14} className="fill-pink-500" />
                {t("checkout.partnerSupport")}
              </span>
              <span className="font-black text-pink-600">₹{tipAmount}</span>
            </div>
          )}

          {walletAmountToUse > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center px-3 py-2 bg-[#F5FBF5] rounded-xl border border-[#1A4516]/10 mb-2">
              <span className="text-[#1A4516] font-black text-[11px] flex items-center gap-2 uppercase tracking-tight">
                <Wallet size={14} />
                {t("checkout.walletApplied")}
              </span>
              <span className="font-black text-[#1A4516]">-₹{walletAmountToUse}</span>
            </motion.div>
          )}

          <div className="mt-4 pt-6 border-t-2 border-dashed border-slate-100">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-[1000] text-slate-800 text-lg uppercase tracking-tight">
                  {previewError ? t("checkout.locationError") : (finalAmountToPay === 0 ? t("checkout.fullyCovered") : t("checkout.totalPayable"))}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${previewError ? "text-red-500" : "text-slate-400"}`}>
                  {previewError ? t("checkout.cannotPlaceOrder") : (finalAmountToPay === 0 ? t("checkout.paidViaWallet") : t("checkout.safePayment"))}
                </span>
              </div>
              <span className={`font-[1000] text-3xl tracking-tighter italic ${previewError ? "text-red-500" : "text-[#1A4516]"}`}>
                {isPreviewLoading ? t("checkout.calculating") : (previewError ? t("checkout.na") : `₹${Math.ceil(finalAmountToPay)}`)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {previewError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-200">
          <p className="text-red-700 font-bold text-sm leading-tight text-center">
            {previewError}
          </p>
        </motion.div>
      )}
    </>
  );
});

export default CheckoutPricingBreakdown;
