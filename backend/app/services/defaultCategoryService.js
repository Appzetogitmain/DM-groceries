import Category from "../models/category.js";
import { invalidate } from "./cacheService.js";

/**
 * The "All" header category is a built-in default:
 *  - it always exists (created on startup if missing),
 *  - it cannot be deleted,
 *  - its name / slug / type / parent / status are fixed; admins can only
 *    change its look (icon, image, colours).
 * Customer apps use its icon/image for the "All" tab and the "All" item in
 * category sidebars.
 */
export const ALL_HEADER_SLUG = "all";
export const ALL_HEADER_NAME = "All";

/**
 * Fields admins may not change on the "All" header. "All" is only a display
 * tab (no products belong to it), so commission / handling fees don't apply.
 */
export const ALL_HEADER_LOCKED_FIELDS = [
  "name",
  "slug",
  "type",
  "parentId",
  "status",
  "adminCommission",
  "adminCommissionType",
  "adminCommissionValue",
  "adminCommissionFixedRule",
  "handlingFees",
  "handlingFeeType",
  "handlingFeeValue",
];

export function isAllHeaderCategory(category) {
  if (!category || category.type !== "header") return false;
  const slug = String(category.slug || "").trim().toLowerCase();
  const name = String(category.name || "").trim().toLowerCase();
  return slug === ALL_HEADER_SLUG || name === ALL_HEADER_SLUG;
}

/** Creates the "All" header if it does not exist yet. Safe to run on every boot. */
export async function ensureAllHeaderCategory() {
  const existing = await Category.findOne({
    type: "header",
    $or: [{ slug: ALL_HEADER_SLUG }, { name: { $regex: /^\s*all\s*$/i } }],
  })
    .select("_id")
    .lean();
  if (existing) return { created: false, id: existing._id };

  try {
    const created = await Category.create({
      name: ALL_HEADER_NAME,
      slug: ALL_HEADER_SLUG,
      type: "header",
      status: "active",
      parentId: null,
      sortOrder: -1,
    });
    invalidate("cache:catalog:categories:*").catch(() => {});
    return { created: true, id: created._id };
  } catch (error) {
    // Another instance created it at the same time, or slug "all" is taken
    if (error?.code === 11000) return { created: false, id: null };
    throw error;
  }
}
