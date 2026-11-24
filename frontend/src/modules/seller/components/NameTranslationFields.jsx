import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { transliterate } from "@/shared/i18n/transliterate";

/**
 * Hindi / Gujarati display names for a product or package.
 *
 * A draft is generated from the English name (phonetic transliteration) and
 * kept in sync while the seller has not edited the field themselves. Once the
 * seller types their own value it is never overwritten. Drafts are only a
 * starting point — sellers should review and correct them.
 */
const FIELDS = [
  { key: "nameHi", lang: "hi", label: "sProducts.nameHi", ph: "जैसे: अमूल बटर" },
  { key: "nameGu", lang: "gu", label: "sProducts.nameGu", ph: "દા.ત. અમૂલ બટર" },
];

const NameTranslationFields = ({ formData, setFormData }) => {
  const { t } = useTranslation();
  const englishName = String(formData.name || "").trim();
  // Last auto-generated draft per field. A field counts as "auto" while empty or equal to it.
  const lastAuto = useRef(null);
  if (lastAuto.current === null) {
    // On first render treat a stored value equal to the draft of the saved English name as auto.
    lastAuto.current = Object.fromEntries(FIELDS.map((f) => [f.key, transliterate(englishName, f.lang)]));
  }

  useEffect(() => {
    const next = {};
    FIELDS.forEach(({ key, lang }) => {
      const draft = englishName ? transliterate(englishName, lang) : "";
      const current = String(formData[key] || "");
      if (!current.trim() || current === lastAuto.current[key]) {
        if (current !== draft) next[key] = draft;
      }
      lastAuto.current[key] = draft;
    });
    if (Object.keys(next).length) setFormData((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [englishName]);

  const cls =
    "w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2";
  const lbl = "text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:col-span-2">
      {FIELDS.map(({ key, lang, label, ph }) => (
        <div key={key} className="space-y-1.5 flex flex-col">
          <label className={lbl}>
            {t(label)} <span className="font-normal normal-case">({t("sProducts.optional")})</span>
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
      ))}
      <p className="md:col-span-2 text-[11px] text-slate-500 -mt-3 ml-1">{t("sProducts.autoNameHint")}</p>
    </div>
  );
};

export default NameTranslationFields;
