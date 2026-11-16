import Setting from "../models/setting.js";
import Product from "../models/product.js";
import Package from "../models/package.js";
import { slugify } from "../utils/slugify.js";
import { getIO } from "../socket/socketManager.js";
import logger from "./logger.js";

export const DEFAULT_PACKAGE_SETTINGS = Object.freeze({
  maxProductsPerPackage: 10,
  minProductsPerPackage: 2,
  maxPackagesPerSeller: 10,
  requireAdminApproval: true,
  requireApprovalOnEdit: true,
});

export const getPackageSettings = async () => {
  try {
    const setting = await Setting.findOne({}).select("packageSettings").lean();
    const raw = setting?.packageSettings || {};
    return {
      maxProductsPerPackage: Number(raw.maxProductsPerPackage) || DEFAULT_PACKAGE_SETTINGS.maxProductsPerPackage,
      minProductsPerPackage: Number(raw.minProductsPerPackage) || DEFAULT_PACKAGE_SETTINGS.minProductsPerPackage,
      maxPackagesPerSeller: Number(raw.maxPackagesPerSeller) || DEFAULT_PACKAGE_SETTINGS.maxPackagesPerSeller,
      requireAdminApproval: raw.requireAdminApproval !== undefined ? Boolean(raw.requireAdminApproval) : DEFAULT_PACKAGE_SETTINGS.requireAdminApproval,
      requireApprovalOnEdit: raw.requireApprovalOnEdit !== undefined ? Boolean(raw.requireApprovalOnEdit) : DEFAULT_PACKAGE_SETTINGS.requireApprovalOnEdit,
    };
  } catch (error) {
    logger.error("Error reading packageSettings:", error);
    return { ...DEFAULT_PACKAGE_SETTINGS };
  }
};

export const generatePackageSlug = async (name) => {
  const baseSlug = slugify(name || "package") || "package";
  let slug = baseSlug;
  let counter = 1;

  while (await Package.exists({ slug })) {
    slug = `${baseSlug}-${counter}-${Date.now().toString(36).slice(-4)}`;
    counter++;
  }

  return slug;
};

export const validateAndPreparePackageItems = async ({
  sellerId,
  items,
  minProducts,
  maxProducts,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Package must contain at least one item.");
  }

  if (items.length < minProducts) {
    throw new Error(`Package must contain at least ${minProducts} distinct products.`);
  }

  if (items.length > maxProducts) {
    throw new Error(`Package cannot exceed ${maxProducts} products (Current limit: ${maxProducts}).`);
  }

  // Deduplicate product IDs in items
  const productIds = items.map((it) => it.productId?.toString()).filter(Boolean);
  const uniqueProductIds = [...new Set(productIds)];

  if (uniqueProductIds.length !== items.length) {
    throw new Error("Duplicate products found in package item list. Adjust the quantity instead.");
  }

  // Verify all products belong to this seller and are approved & active
  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    sellerId,
    status: { $ne: "inactive" },
    $or: [
      { approvalStatus: { $in: ["approved", "APPROVED", "Approved", null, ""] } },
      { approvalStatus: { $exists: false } },
    ],
  }).lean();

  if (products.length !== uniqueProductIds.length) {
    throw new Error(
      "Some selected products do not belong to your store or are not currently approved and active."
    );
  }

  const productsMap = new Map(products.map((p) => [p._id.toString(), p]));

  let originalTotalPrice = 0;
  let packageTotalPrice = 0;
  let maxPossibleStock = Infinity;
  const validatedItems = [];

  for (const item of items) {
    const prod = productsMap.get(item.productId.toString());
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const regularPrice = Number(prod.salePrice > 0 ? prod.salePrice : prod.price) || 0;

    // Check seller-specified pack price
    let customPrice = regularPrice;
    const rawCustom = item.packagePricePerUnit !== undefined ? item.packagePricePerUnit : item.price;
    if (rawCustom !== undefined && rawCustom !== null && rawCustom !== "") {
      const parsed = parseFloat(rawCustom);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error(`Invalid package price for product "${prod.name}".`);
      }
      if (parsed > regularPrice) {
        throw new Error(
          `Pack price for "${prod.name}" (₹${parsed}) cannot be higher than its regular price (₹${regularPrice}).`
        );
      }
      customPrice = parsed;
    }

    originalTotalPrice += regularPrice * qty;
    packageTotalPrice += customPrice * qty;

    // Check how many full packages can be created given this product's current stock
    const prodStock = Math.max(0, Number(prod.stock) || 0);
    const possibleFromThisProd = Math.floor(prodStock / qty);
    if (possibleFromThisProd < maxPossibleStock) {
      maxPossibleStock = possibleFromThisProd;
    }

    validatedItems.push({
      productId: prod._id,
      variantId: item.variantId || null,
      quantity: qty,
      originalPrice: regularPrice,
      packagePricePerUnit: customPrice,
      priceAtAddition: customPrice,
      totalItemPrice: Math.round(customPrice * qty * 100) / 100,
    });
  }

  return {
    validatedItems,
    originalTotalPrice: Math.round(originalTotalPrice * 100) / 100,
    packageTotalPrice: Math.round(packageTotalPrice * 100) / 100,
    derivedStock: maxPossibleStock === Infinity ? 0 : maxPossibleStock,
    productsMap,
  };
};

export const emitPackageChangeSocket = (eventType, payload = {}) => {
  try {
    const io = getIO();
    if (!io) return;
    io.to("admin:dashboard").emit("notification:new", {
      eventType: "ADMIN_PENDING_COUNTS_CHANGED",
      subType: eventType,
      ...payload,
    });
    io.to("admin:system").emit("package:updated", {
      eventType,
      ...payload,
    });
  } catch {
    // Non-blocking if socket is not initialized
  }
};

