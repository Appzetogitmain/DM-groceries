import Category from "../models/category.js";
import { buildKey, getOrSet, getTTL } from "./cacheService.js";

/**
 * Customer-side category visibility.
 *
 * A category is hidden from customers when it is inactive OR any of its
 * ancestors (category -> header) is inactive. Admin and seller views are not
 * affected by this.
 *
 * The cache key lives under cache:catalog:categories:* so every category
 * create / update / delete / reorder (which invalidate that pattern) clears it.
 */
const HIDDEN_IDS_KEY = buildKey("catalog", "categories", "public:hidden-ids");

async function computeHiddenCategoryIds() {
  const all = await Category.find({}).select("_id status parentId").lean();
  const byId = new Map(all.map((c) => [String(c._id), c]));

  const hidden = [];
  for (const cat of all) {
    let c = cat;
    for (let depth = 0; c && depth < 5; depth++) {
      if (c.status === "inactive") {
        hidden.push(String(cat._id));
        break;
      }
      c = c.parentId ? byId.get(String(c.parentId)) : null;
    }
  }
  return hidden;
}

/** Ids (strings) of categories customers must not see. */
export async function getHiddenCategoryIds() {
  const ids = await getOrSet(HIDDEN_IDS_KEY, computeHiddenCategoryIds, getTTL("categories"));
  return Array.isArray(ids) ? ids : [];
}

/** Mongo filter that excludes products placed in a hidden header/category/subcategory. */
export async function buildVisibleProductCategoryFilter() {
  const hidden = await getHiddenCategoryIds();
  if (!hidden.length) return null;
  return {
    headerId: { $nin: hidden },
    categoryId: { $nin: hidden },
    subcategoryId: { $nin: hidden },
  };
}
