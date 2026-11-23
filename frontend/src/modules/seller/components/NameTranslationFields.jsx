import React from "react";
import { useTranslation } from "react-i18next";

/** Optional Hindi / Gujarati display names for a product or package. */
const NameTranslationFields = ({ formData, setFormData }) => {
  const { t } = useTranslation();
  const cls =
    "w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2";
  const lbl = "text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1";
  const field = (key, lang, labelKey, ph) => (
    <div className="space-y-1.5 flex flex-col">
      <label className={lbl}>
        {t(labelKey)} <span className="font-normal normal-case">({t("sProducts.optional")})</span>
      </label>
      <input
        lang={lang}
        value={formData[key] || ""}
        onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
        className={cls}
        placeholder={ph}
        maxLength={150}
      />
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:col-span-2">
      {field("nameHi", "hi", "sProducts.nameHi", "जैसे: अमूल बटर")}
      {field("nameGu", "gu", "sProducts.nameGu", "દા.ત. અમૂલ બટર")}
    </div>
  );
};

export default NameTranslationFields;
