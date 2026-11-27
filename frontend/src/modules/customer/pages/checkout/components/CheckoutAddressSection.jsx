import React from "react";
import { Check, Contact2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/**
 * CheckoutAddressSection
 *
 * Props:
 *   currentAddress       – the active delivery address object
 *   savedRecipient       – "order for someone else" recipient object or null
 *   savedAddresses       – array of saved addresses from LocationContext
 *   onSelectAddress      – () => void  — opens the address-selection modal
 *   onEditAddress        – () => void  — opens the edit-address modal
 *   onUseCurrentLocation – () => void  — triggers live-location detection
 *
 * Internal state for the "order for someone else" form is kept here because
 * it is purely presentational; the parent only needs the saved result.
 */
const CheckoutAddressSection = React.memo(function CheckoutAddressSection({
  currentAddress,
  savedRecipient,
  savedAddresses,
  onSelectAddress,
  onEditAddress,
  onUseCurrentLocation,
  // Extra props forwarded from CheckoutPage that the section needs
  isFetchingLocation,
  showRecipientForm,
  onToggleRecipientForm,
  recipientData,
  onRecipientDataChange,
  onSaveRecipient,
  onRemoveRecipient,
  displayName,
  displayPhone,
  displayAddress,
}) {
  const { t } = useTranslation();
  return (
    <motion.div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* "Order for someone else" toggle */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-500 font-medium">
          {t("checkout.orderingForSomeone")}
        </span>
        <button
          onClick={onToggleRecipientForm}
          className="text-[#1A4516] text-xs font-bold hover:underline">
          {showRecipientForm
            ? t("common.close")
            : savedRecipient
              ? t("checkout.changeDetails")
              : t("checkout.addDetails")}
        </button>
      </div>

      {/* Saved recipient card */}
      {savedRecipient && !showRecipientForm && (
        <div className="mb-4 p-4 bg-[#F5FBF5] border border-[#1A4516]/10 rounded-2xl flex items-start justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-[#E6F3E6] flex items-center justify-center text-[#1A4516] flex-shrink-0">
              <Contact2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {savedRecipient.name}
              </p>
              <p className="text-xs text-[#1A4516] font-bold mb-1">
                {savedRecipient.phone}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
                {savedRecipient.completeAddress}
                {savedRecipient.landmark && `, ${savedRecipient.landmark}`}
                {savedRecipient.pincode && ` - ${savedRecipient.pincode}`}
              </p>
            </div>
          </div>
          <button
            onClick={onRemoveRecipient}
            className="text-red-500 text-xs font-bold hover:underline">
            {t("common.remove")}
          </button>
        </div>
      )}

      {/* Recipient form */}
      <AnimatePresence>
        {showRecipientForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden mb-4">
            <div className="bg-[#f8f9fb] rounded-2xl p-4 border border-slate-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">
                  {t("checkout.enterAddressDetails")}
                </h4>
                <div className="space-y-3">
                  <Input
                    placeholder={t("checkout.completeAddressPh")}
                    value={recipientData.completeAddress}
                    onChange={(e) =>
                      onRecipientDataChange({ ...recipientData, completeAddress: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-200 focus:ring-[#1A4516] focus:border-[#1A4516] text-sm"
                  />
                  <Input
                    placeholder={t("checkout.landmarkPh")}
                    value={recipientData.landmark}
                    onChange={(e) =>
                      onRecipientDataChange({ ...recipientData, landmark: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-200 focus:ring-[#1A4516] focus:border-[#1A4516] text-sm"
                  />
                  <Input
                    placeholder={t("checkout.pincodePh")}
                    value={recipientData.pincode}
                    onChange={(e) =>
                      onRecipientDataChange({ ...recipientData, pincode: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-200 focus:ring-[#1A4516] focus:border-[#1A4516] text-sm"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  {t("checkout.enterReceiverDetails")}
                </h4>
                <p className="text-[10px] text-slate-400 mb-3 font-medium">
                  {t("checkout.contactReceiver")}
                </p>
                <div className="space-y-3">
                  <Input
                    placeholder={t("checkout.receiverNamePh")}
                    value={recipientData.name}
                    onChange={(e) =>
                      onRecipientDataChange({ ...recipientData, name: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-200 focus:ring-[#1A4516] focus:border-[#1A4516] text-sm"
                  />
                  <div className="relative">
                    <Input
                      placeholder={t("checkout.receiverPhonePh")}
                      value={recipientData.phone}
                      onChange={(e) =>
                        onRecipientDataChange({ ...recipientData, phone: e.target.value })
                      }
                      className="h-12 rounded-xl border-slate-200 focus:ring-[#1A4516] focus:border-[#1A4516] text-sm pr-10"
                    />
                    <Contact2
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={onSaveRecipient}
                className="w-full h-12 bg-[var(--brand-700)] hover:bg-[var(--brand-600)] text-white font-bold rounded-xl">
                {t("checkout.saveAddress")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery address heading */}
      <div className="mb-3">
        <h3 className="font-black text-slate-800 text-base">{t("checkout.deliveryAddress")}</h3>
        <p className="text-xs text-slate-500">{t("checkout.selectOrEdit")}</p>
      </div>

      {/* Active address card */}
      <div className="border rounded-xl p-3 mb-3 relative cursor-pointer transition-all border-[#1A4516] bg-[#F5FBF5]/50">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <div className="h-5 w-5 rounded-full bg-[#1A4516] flex items-center justify-center">
              <Check size={12} className="text-white stroke-[4]" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 text-sm">{displayName}</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditAddress(); }}
                  className="text-slate-500 text-xs font-bold hover:underline">
                  {t("common.edit")}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectAddress(); }}
                  className="text-[#1A4516] text-xs font-bold hover:underline">
                  {t("checkout.change")}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{displayPhone}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{displayAddress}</p>
          </div>
        </div>
      </div>

      {/* Use current location (hidden for fixed-location accounts) */}
      {onUseCurrentLocation && (
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isFetchingLocation}
          className="mt-3 w-full py-2.5 rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
          {isFetchingLocation ? t("checkout.detectingLive") : t("checkout.useLive")}
        </button>
      )}

      {/* Confirmation banner */}
      <motion.div className="mt-3 rounded-2xl border border-[#1A4516]/10 bg-[#F5FBF5]/70 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-black  flex items-center justify-center shadow-[#1A4516]/40 shadow-md">
          <Check size={16} className="text-white stroke-[3]" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[#1A4516]">
            {t("checkout.addressConfirmed")}
          </p>
          <p className="text-[11px] font-medium text-[#1A4516]/80">
            {t("checkout.deliverToEntered")}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default CheckoutAddressSection;
