import ExperienceSection from "../models/experienceSection.js";

/**
 * Built-in home sections.
 *
 * The customer home page has fixed sections (hero "Shop Now" banner, Make
 * Your Own List, Bachat Combos, Shop by Category, product list). They are
 * stored as ExperienceSection documents with displayType "builtin" so admins
 * can reorder them together with custom sections and switch them on/off.
 * They can't be deleted, and nothing else about them can be changed.
 */
export const BUILTIN_SECTIONS = [
  { key: "hero", title: "Shop Now banner" },
  { key: "my_list", title: "Make Your Own List" },
  { key: "combos", title: "Bachat Combos" },
  { key: "shop_by_category", title: "Shop by Category" },
  { key: "products", title: "Products" }, // "Lowest Price" on home, category products on header pages
];

export const BUILTIN_KEYS = BUILTIN_SECTIONS.map((s) => s.key);

export const isBuiltinSection = (section) => section?.displayType === "builtin";

const pageFilter = (pageType, headerId) => ({
  pageType,
  headerId: pageType === "header" ? headerId : null,
});

/** Order value that puts a new section at the end of the page. */
export async function getNextSectionOrder(pageType, headerId = null) {
  const last = await ExperienceSection.findOne(pageFilter(pageType, headerId))
    .sort({ order: -1 })
    .select("order")
    .lean();
  return last ? Number(last.order || 0) + 1 : 0;
}

/**
 * Fix pages where several sections share the same order value.
 *
 * Older code saved every new section with order 0. The admin screen showed
 * such a section at the end (where it was added), but the app sorted it next
 * to whatever else had order 0, e.g. right under the banner. When orders
 * collide, the earliest-created section keeps its place and the later ones
 * move to the end (oldest first), matching where the admin added them.
 * Orders are then renumbered 0..n-1. Returns true if anything changed.
 */
export async function repairDuplicateSectionOrders(pageType, headerId = null) {
  const sections = await ExperienceSection.find(pageFilter(pageType, headerId))
    .select("_id order createdAt")
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .lean();
  if (sections.length < 2) return false;

  const seenOrders = new Set();
  const keep = [];
  const moved = [];
  for (const s of sections) {
    const o = Number(s.order || 0);
    if (seenOrders.has(o)) moved.push(s);
    else {
      seenOrders.add(o);
      keep.push(s);
    }
  }
  if (!moved.length) return false;

  moved.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const final = [...keep, ...moved];
  await ExperienceSection.bulkWrite(
    final.map((s, i) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { order: i } } },
    })),
  );
  return true;
}

/**
 * Make sure every built-in section exists for this page. Missing ones are
 * added at the top, in the app's default order, so the page looks exactly as
 * before until an admin moves them. Existing custom sections keep their order
 * and are shifted below. Returns true if anything was created.
 */
export async function ensureBuiltinSections(pageType, headerId = null) {
  if (!["home", "header"].includes(pageType)) return false;
  if (pageType === "header" && !headerId) return false;

  const filter = pageFilter(pageType, headerId);
  const existing = await ExperienceSection.find({ ...filter, displayType: "builtin" })
    .select("builtinKey")
    .lean();
  const have = new Set(existing.map((s) => s.builtinKey));
  const missing = BUILTIN_SECTIONS.filter((b) => !have.has(b.key));
  if (!missing.length) return false;

  // Shift every current section down to make room at the top
  await ExperienceSection.updateMany(filter, { $inc: { order: missing.length } });

  try {
    await ExperienceSection.insertMany(
      missing.map((b, i) => ({
        ...filter,
        displayType: "builtin",
        builtinKey: b.key,
        title: b.title,
        status: "active",
        order: i,
      })),
      { ordered: false },
    );
  } catch (error) {
    // Two admins opening the page at once: duplicates are harmless here
    console.warn("[BuiltinSections] insert warning:", error.message);
  }
  return true;
}
