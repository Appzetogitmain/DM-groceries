// Shared variant helpers for customer-facing product UI.
//
// Rule: when a product has multiple variants, the variant with the MOST stock
// is the default (shown on cards, pre-selected in the detail view). A product
// is only "out of stock" when every variant is out of stock.

/** Stable key used for cart matching (same convention as CartContext). */
export const getVariantKey = (variant) =>
  String(variant?.sku || variant?.name || "").trim();

/** Stock of a variant; falls back to product stock when the variant has none set. */
export const getVariantStock = (variant, product) => {
  const raw = variant?.stock;
  if (raw !== undefined && raw !== null && raw !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return Number(product?.stock || 0);
};

/**
 * Pick the default variant, walking variants in their listed order:
 * the first variant that is in stock (stock > 0). Low stock does NOT skip a
 * variant — we only move to the next one when the current is out of stock.
 * If every variant is out of stock, the first variant is returned.
 * Returns null when the product has no variants.
 */
export const pickDefaultVariant = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return null;

  const inStock = variants.find((v) => getVariantStock(v, product) > 0);
  return inStock || variants[0];
};

/** Effective price info for a variant (sale price only counts if lower than MRP). */
export const getVariantPricing = (variant, product) => {
  const mrp = Number(variant?.price || product?.originalPrice || product?.price || 0);
  const sale = Number(variant?.salePrice || 0);
  const hasDiscount = sale > 0 && sale < mrp;
  return {
    displayPrice: hasDiscount ? sale : mrp,
    originalPrice: hasDiscount ? mrp : null,
    discountPercent: hasDiscount && mrp > 0 ? Math.round(((mrp - sale) / mrp) * 100) : 0,
  };
};
