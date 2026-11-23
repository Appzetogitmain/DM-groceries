import React from "react";

/**
 * Optional Hindi / Gujarati display names for a category.
 * Shown to customers and sellers using those languages; when left empty the
 * English `name` is used.
 */
const CategoryTranslationFields = ({ formData, setFormData }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Name in Hindi <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <input
        type="text"
        lang="hi"
        value={formData.nameHi || ""}
        onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        placeholder="जैसे: डेयरी उत्पाद"
        maxLength={80}
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Name in Gujarati <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <input
        type="text"
        lang="gu"
        value={formData.nameGu || ""}
        onChange={(e) => setFormData({ ...formData, nameGu: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        placeholder="દા.ત. ડેરી ઉત્પાદનો"
        maxLength={80}
      />
    </div>
  </div>
);

export default CategoryTranslationFields;
