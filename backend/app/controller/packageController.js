import mongoose from "mongoose";
import Package from "../models/package.js";
import Product from "../models/product.js";
import Setting from "../models/setting.js";
import Seller from "../models/seller.js";
import handleResponse from "../utils/helper.js";
import logger from "../services/logger.js";
import { uploadToCloudinary } from "../services/mediaService.js";
import {
  getPackageSettings,
  generatePackageSlug,
  validateAndPreparePackageItems,
  emitPackageChangeSocket,
} from "../services/packageService.js";

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

/**
 * GET /api/packages/admin/settings
 * Fetch current global package limits and rules
 */
export const getAdminPackageSettings = async (req, res) => {
  try {
    const settings = await getPackageSettings();
    return handleResponse(res, 200, "Package settings retrieved successfully", settings);
  } catch (error) {
    logger.error("Error fetching package settings:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PUT /api/packages/admin/settings
 * Update global package limits and rules
 */
export const updateAdminPackageSettings = async (req, res) => {
  try {
    const {
      maxProductsPerPackage,
      minProductsPerPackage,
      maxPackagesPerSeller,
      requireAdminApproval,
      requireApprovalOnEdit,
    } = req.body;

    const maxProd = parseInt(maxProductsPerPackage, 10);
    const minProd = parseInt(minProductsPerPackage, 10);
    const maxPkgs = parseInt(maxPackagesPerSeller, 10);

    if (isNaN(maxProd) || maxProd < 2) {
      return handleResponse(res, 400, "Maximum products per package must be at least 2.");
    }
    if (isNaN(minProd) || minProd < 1 || minProd > maxProd) {
      return handleResponse(res, 400, "Minimum products per package must be at least 1 and cannot exceed maximum products.");
    }
    if (isNaN(maxPkgs) || maxPkgs < 1) {
      return handleResponse(res, 400, "Maximum packages per seller must be at least 1.");
    }

    const packageSettings = {
      maxProductsPerPackage: maxProd,
      minProductsPerPackage: minProd,
      maxPackagesPerSeller: maxPkgs,
      requireAdminApproval: Boolean(requireAdminApproval),
      requireApprovalOnEdit: Boolean(requireApprovalOnEdit),
    };

    const updated = await Setting.findOneAndUpdate(
      {},
      { $set: { packageSettings } },
      { new: true, upsert: true }
    ).select("packageSettings");

    emitPackageChangeSocket("ADMIN_PACKAGE_SETTINGS_UPDATED", { packageSettings });

    return handleResponse(
      res,
      200,
      "Package settings updated successfully",
      updated?.packageSettings || packageSettings
    );
  } catch (error) {
    logger.error("Error updating package settings:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/admin
 * List packages across all sellers with pagination, filters, and search
 */
export const getAdminPackages = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { approvalStatus, status, sellerId, search, sortBy } = req.query;

    const filter = {};

    if (approvalStatus && approvalStatus !== "all") {
      filter.approvalStatus = approvalStatus;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (sellerId && sellerId !== "all") {
      filter.sellerId = sellerId;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    let sort = { createdAt: -1 };
    if (sortBy === "oldest") sort = { createdAt: 1 };
    if (sortBy === "price_high") sort = { packagePrice: -1 };
    if (sortBy === "price_low") sort = { packagePrice: 1 };

    const [items, total, stats] = await Promise.all([
      Package.find(filter)
        .populate("sellerId", "shopName name email phone")
        .populate("items.productId", "name sku price salePrice stock mainImage status approvalStatus")
        .populate("approvalReviewedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Package.countDocuments(filter),
      Package.aggregate([
        {
          $group: {
            _id: "$approvalStatus",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    (stats || []).forEach((st) => {
      const key = st._id?.toLowerCase();
      if (summary[key] !== undefined) {
        summary[key] = st.count;
      }
      summary.all += st.count;
    });

    return handleResponse(res, 200, "Packages retrieved successfully", {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    });
  } catch (error) {
    logger.error("Error fetching admin packages:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/admin/:id
 * Get single package details for admin review
 */
export const getAdminPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
      .populate("sellerId", "shopName name email phone address city")
      .populate("items.productId", "name sku price salePrice stock mainImage status approvalStatus unit weight")
      .populate("approvalReviewedBy", "name email")
      .lean();

    if (!pkg) {
      return handleResponse(res, 404, "Package not found.");
    }

    return handleResponse(res, 200, "Package retrieved successfully", pkg);
  } catch (error) {
    logger.error("Error fetching admin package by id:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PATCH /api/packages/admin/:id/approve
 * Approve a seller's package
 */
export const approvePackage = async (req, res) => {
  try {
    const { approvalNote } = req.body;
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return handleResponse(res, 404, "Package not found.");
    }

    pkg.approvalStatus = "approved";
    pkg.approvalReviewedAt = new Date();
    pkg.approvalReviewedBy = req.user._id || req.user.id;
    pkg.approvalNote = approvalNote?.trim() || "Approved by Administrator";
    pkg.rejectionReason = "";

    await pkg.save();

    emitPackageChangeSocket("ADMIN_PACKAGE_APPROVED", {
      packageId: pkg._id,
      sellerId: pkg.sellerId,
    });

    return handleResponse(res, 200, "Package approved successfully", pkg);
  } catch (error) {
    logger.error("Error approving package:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PATCH /api/packages/admin/:id/reject
 * Reject a seller's package with mandatory reason
 */
export const rejectPackage = async (req, res) => {
  try {
    const { rejectionReason, approvalNote } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return handleResponse(res, 400, "Please provide a valid rejection reason.");
    }

    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return handleResponse(res, 404, "Package not found.");
    }

    pkg.approvalStatus = "rejected";
    pkg.approvalReviewedAt = new Date();
    pkg.approvalReviewedBy = req.user._id || req.user.id;
    pkg.rejectionReason = rejectionReason.trim();
    pkg.approvalNote = approvalNote?.trim() || "";

    await pkg.save();

    emitPackageChangeSocket("ADMIN_PACKAGE_REJECTED", {
      packageId: pkg._id,
      sellerId: pkg.sellerId,
    });

    return handleResponse(res, 200, "Package rejected successfully", pkg);
  } catch (error) {
    logger.error("Error rejecting package:", error);
    return handleResponse(res, 500, error.message);
  }
};

// ==========================================
// SELLER CONTROLLERS
// ==========================================

/**
 * GET /api/packages/seller/quota
 * Get current quota usage and limits for seller
 */
export const getSellerPackageQuota = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const settings = await getPackageSettings();

    const usedCount = await Package.countDocuments({ sellerId });
    const maxAllowed = settings.maxPackagesPerSeller;

    return handleResponse(res, 200, "Quota retrieved", {
      used: usedCount,
      maxAllowed,
      remaining: Math.max(0, maxAllowed - usedCount),
      canCreate: usedCount < maxAllowed,
      minProductsPerPackage: settings.minProductsPerPackage,
      maxProductsPerPackage: settings.maxProductsPerPackage,
      requireAdminApproval: settings.requireAdminApproval,
    });
  } catch (error) {
    logger.error("Error fetching seller quota:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/seller
 * List packages owned by the authenticated seller
 */
export const getSellerPackages = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { approvalStatus, status, search } = req.query;

    const filter = { sellerId };

    if (approvalStatus && approvalStatus !== "all") {
      filter.approvalStatus = approvalStatus;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const settings = await getPackageSettings();

    const [items, total, allSellerPkgsCount, stats] = await Promise.all([
      Package.find(filter)
        .populate("items.productId", "name sku price salePrice stock mainImage status approvalStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Package.countDocuments(filter),
      Package.countDocuments({ sellerId }),
      Package.aggregate([
        { $match: { sellerId: Package.base.Types.ObjectId.createFromHexString(sellerId.toString()) } },
        {
          $group: {
            _id: "$approvalStatus",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      all: allSellerPkgsCount,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    (stats || []).forEach((st) => {
      const key = st._id?.toLowerCase();
      if (summary[key] !== undefined) {
        summary[key] = st.count;
      }
    });

    return handleResponse(res, 200, "Seller packages retrieved successfully", {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
      quota: {
        used: allSellerPkgsCount,
        maxAllowed: settings.maxPackagesPerSeller,
        remaining: Math.max(0, settings.maxPackagesPerSeller - allSellerPkgsCount),
        canCreate: allSellerPkgsCount < settings.maxPackagesPerSeller,
        minProductsPerPackage: settings.minProductsPerPackage,
        maxProductsPerPackage: settings.maxProductsPerPackage,
        requireAdminApproval: settings.requireAdminApproval,
      },
    });
  } catch (error) {
    logger.error("Error fetching seller packages:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/seller/eligible-products
 * Fetch seller's own products that are approved, active, and can be bundled
 */
export const getEligibleProductsForPackage = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const search = req.query.search?.trim();

    const sellerObjId = mongoose.Types.ObjectId.isValid(sellerId)
      ? new mongoose.Types.ObjectId(sellerId.toString())
      : sellerId;

    const filter = {
      $and: [
        {
          $or: [
            { sellerId: sellerObjId },
            { sellerId: sellerId.toString() },
          ],
        },
        {
          status: { $ne: "inactive" },
        },
        {
          $or: [
            { approvalStatus: { $in: ["approved", "APPROVED", "Approved", null, ""] } },
            { approvalStatus: { $exists: false } },
          ],
        },
      ],
    };

    if (search) {
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
        ],
      });
    }

    const products = await Product.find(filter)
      .select("name sku price salePrice stock mainImage unit weight brand status approvalStatus")
      .sort({ name: 1 })
      .limit(300)
      .lean();

    return handleResponse(res, 200, "Eligible products retrieved", {
      products,
      total: products.length,
    });
  } catch (error) {
    logger.error("Error fetching eligible products:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/seller/:id
 * Get single package details for seller
 */
export const getSellerPackageById = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const pkg = await Package.findOne({ _id: req.params.id, sellerId })
      .populate("items.productId", "name sku price salePrice stock mainImage status approvalStatus unit weight")
      .lean();

    if (!pkg) {
      return handleResponse(res, 404, "Package not found or unauthorized.");
    }

    return handleResponse(res, 200, "Package retrieved successfully", pkg);
  } catch (error) {
    logger.error("Error fetching seller package by id:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * POST /api/packages/seller
 * Create a new package by seller
 */
export const createPackage = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const settings = await getPackageSettings();

    // 1. Quota check: how many packages does this seller currently have?
    const currentPackagesCount = await Package.countDocuments({ sellerId });
    if (currentPackagesCount >= settings.maxPackagesPerSeller) {
      return handleResponse(
        res,
        400,
        `Package limit reached. You can create up to ${settings.maxPackagesPerSeller} packages. Delete or deactivate existing packages to create a new one.`
      );
    }

    // 2. Parse payload (handles multipart form data or application/json)
    const rawItems = typeof req.body.items === "string" ? JSON.parse(req.body.items) : req.body.items;
    const name = (req.body.name || "").trim();
    const description = (req.body.description || "").trim();

    if (!name) {
      return handleResponse(res, 400, "Package title is required.");
    }

    // 3. Validate items & compute totals
    const { validatedItems, originalTotalPrice, packageTotalPrice, derivedStock } =
      await validateAndPreparePackageItems({
        sellerId,
        items: rawItems,
        minProducts: settings.minProductsPerPackage,
        maxProducts: settings.maxProductsPerPackage,
      });

    const parsedPrice = parseFloat(req.body.packagePrice);
    const packagePrice =
      !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : packageTotalPrice;

    if (packagePrice <= 0) {
      return handleResponse(res, 400, "Valid package price is required.");
    }

    // Pricing integrity check: Package price shouldn't exceed original total price
    if (packagePrice > originalTotalPrice) {
      return handleResponse(
        res,
        400,
        `Package price (₹${packagePrice}) cannot exceed the sum of individual regular products (₹${originalTotalPrice}).`
      );
    }

    const discountPercentage =
      originalTotalPrice > 0
        ? Math.max(0, Math.round(((originalTotalPrice - packagePrice) / originalTotalPrice) * 100))
        : 0;

    // 4. Handle Image uploads
    let coverImage = req.body.coverImage || "";
    const galleryImages = Array.isArray(req.body.galleryImages) ? [...req.body.galleryImages] : [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const url = await uploadToCloudinary(file.buffer, "packages", {
            mimeType: file.mimetype,
            resourceType: "image",
          });
          if (file.fieldname === "coverImage") {
            coverImage = url;
          } else if (file.fieldname === "galleryImages") {
            galleryImages.push(url);
          }
        } catch (uploadErr) {
          logger.error("Cloudinary package image upload failed:", uploadErr);
        }
      }
    }

    // Fallback: If no cover image uploaded, use main image of first item
    if (!coverImage && validatedItems.length > 0) {
      const firstProd = await Product.findById(validatedItems[0].productId).select("mainImage").lean();
      if (firstProd?.mainImage) {
        coverImage = firstProd.mainImage;
      }
    }

    const slug = await generatePackageSlug(name);
    const initialApprovalStatus = settings.requireAdminApproval ? "pending" : "approved";

    const customStock = req.body.stock !== undefined ? parseInt(req.body.stock, 10) : derivedStock;
    const finalStock = isNaN(customStock) ? derivedStock : Math.min(customStock, derivedStock);

    const newPackage = new Package({
      sellerId,
      name,
      slug,
      description,
      coverImage,
      galleryImages,
      items: validatedItems,
      originalTotalPrice,
      packagePrice,
      discountPercentage,
      stock: Math.max(0, finalStock),
      status: "active",
      approvalStatus: initialApprovalStatus,
      approvalRequestedAt: new Date(),
      lastSubmittedByRole: "seller",
    });

    await newPackage.save();

    emitPackageChangeSocket("SELLER_PACKAGE_SUBMITTED", {
      packageId: newPackage._id,
      sellerId,
    });

    return handleResponse(
      res,
      201,
      initialApprovalStatus === "pending"
        ? "Package created and submitted for Admin approval."
        : "Package created and published successfully.",
      newPackage
    );
  } catch (error) {
    logger.error("Error creating package:", error);
    return handleResponse(res, 400, error.message);
  }
};

/**
 * PUT /api/packages/seller/:id
 * Update an existing package
 */
export const updatePackage = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const settings = await getPackageSettings();

    const existingPackage = await Package.findOne({ _id: req.params.id, sellerId });
    if (!existingPackage) {
      return handleResponse(res, 404, "Package not found or unauthorized.");
    }

    const rawItems = req.body.items
      ? typeof req.body.items === "string"
        ? JSON.parse(req.body.items)
        : req.body.items
      : existingPackage.items;

    const name = req.body.name ? req.body.name.trim() : existingPackage.name;
    const description =
      req.body.description !== undefined ? req.body.description.trim() : existingPackage.description;

    const { validatedItems, originalTotalPrice, packageTotalPrice, derivedStock } =
      await validateAndPreparePackageItems({
        sellerId,
        items: rawItems,
        minProducts: settings.minProductsPerPackage,
        maxProducts: settings.maxProductsPerPackage,
      });

    const parsedPrice =
      req.body.packagePrice !== undefined ? parseFloat(req.body.packagePrice) : existingPackage.packagePrice;
    const packagePrice =
      !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : packageTotalPrice;

    if (packagePrice <= 0) {
      return handleResponse(res, 400, "Valid package price is required.");
    }

    if (packagePrice > originalTotalPrice) {
      return handleResponse(
        res,
        400,
        `Package price (₹${packagePrice}) cannot exceed the sum of individual products (₹${originalTotalPrice}).`
      );
    }

    const discountPercentage =
      originalTotalPrice > 0
        ? Math.max(0, Math.round(((originalTotalPrice - packagePrice) / originalTotalPrice) * 100))
        : 0;

    // Handle files if uploaded
    let coverImage = req.body.coverImage || existingPackage.coverImage;
    const galleryImages = Array.isArray(req.body.galleryImages)
      ? [...req.body.galleryImages]
      : existingPackage.galleryImages;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const url = await uploadToCloudinary(file.buffer, "packages", {
            mimeType: file.mimetype,
            resourceType: "image",
          });
          if (file.fieldname === "coverImage") {
            coverImage = url;
          } else if (file.fieldname === "galleryImages") {
            galleryImages.push(url);
          }
        } catch (uploadErr) {
          logger.error("Cloudinary package image upload failed:", uploadErr);
        }
      }
    }

    // Re-approval logic: If configured or if currently rejected, editing resets approvalStatus to pending
    const needsApproval =
      settings.requireApprovalOnEdit || existingPackage.approvalStatus === "rejected";

    existingPackage.name = name;
    existingPackage.description = description;
    existingPackage.coverImage = coverImage;
    existingPackage.galleryImages = galleryImages;
    existingPackage.items = validatedItems;
    existingPackage.originalTotalPrice = originalTotalPrice;
    existingPackage.packagePrice = packagePrice;
    existingPackage.discountPercentage = discountPercentage;
    existingPackage.stock = Math.min(derivedStock, existingPackage.stock || derivedStock);

    if (needsApproval) {
      existingPackage.approvalStatus = "pending";
      existingPackage.approvalRequestedAt = new Date();
      existingPackage.rejectionReason = "";
      existingPackage.approvalNote = "";
    }

    await existingPackage.save();

    emitPackageChangeSocket("SELLER_PACKAGE_UPDATED", {
      packageId: existingPackage._id,
      sellerId,
    });

    return handleResponse(
      res,
      200,
      needsApproval
        ? "Package updated and resubmitted for Admin approval."
        : "Package updated successfully.",
      existingPackage
    );
  } catch (error) {
    logger.error("Error updating package:", error);
    return handleResponse(res, 400, error.message);
  }
};

/**
 * DELETE /api/packages/seller/:id
 * Delete a package
 */
export const deletePackage = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const pkg = await Package.findOneAndDelete({ _id: req.params.id, sellerId });

    if (!pkg) {
      return handleResponse(res, 404, "Package not found or unauthorized.");
    }

    emitPackageChangeSocket("SELLER_PACKAGE_DELETED", {
      packageId: req.params.id,
      sellerId,
    });

    return handleResponse(res, 200, "Package deleted successfully.");
  } catch (error) {
    logger.error("Error deleting package:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * PATCH /api/packages/seller/:id/toggle-status
 * Toggle active/inactive status for seller package
 */
export const togglePackageStatus = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const pkg = await Package.findOne({ _id: req.params.id, sellerId });

    if (!pkg) {
      return handleResponse(res, 404, "Package not found or unauthorized.");
    }

    pkg.status = pkg.status === "active" ? "inactive" : "active";
    await pkg.save();

    return handleResponse(res, 200, `Package is now ${pkg.status}.`, pkg);
  } catch (error) {
    logger.error("Error toggling package status:", error);
    return handleResponse(res, 500, error.message);
  }
};

// ==========================================
// PUBLIC / CUSTOMER CONTROLLERS
// ==========================================

/**
 * GET /api/packages/public
 * Public / Customer endpoint to retrieve approved & active packages
 */
export const getPublicPackages = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { sellerId, search } = req.query;

    const filter = {
      status: "active",
      approvalStatus: "approved",
    };

    if (sellerId && sellerId !== "all") {
      filter.sellerId = sellerId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Package.find(filter)
        .populate("sellerId", "shopName address city rating")
        .populate("items.productId", "name sku price salePrice stock mainImage unit weight")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Package.countDocuments(filter),
    ]);

    return handleResponse(res, 200, "Packages retrieved successfully", {
      packages: items,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("Error fetching public packages:", error);
    return handleResponse(res, 500, error.message);
  }
};

/**
 * GET /api/packages/public/:id
 * Public endpoint to fetch single package details by ID or slug
 */
export const getPublicPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    let pkg;

    if (mongoose.Types.ObjectId.isValid(id)) {
      pkg = await Package.findOne({
        _id: id,
        status: "active",
        approvalStatus: "approved",
      })
        .populate("sellerId", "shopName address city rating")
        .populate("items.productId", "name sku price salePrice stock mainImage unit weight brand")
        .lean();
    } else {
      pkg = await Package.findOne({
        slug: id,
        status: "active",
        approvalStatus: "approved",
      })
        .populate("sellerId", "shopName address city rating")
        .populate("items.productId", "name sku price salePrice stock mainImage unit weight brand")
        .lean();
    }

    if (!pkg) {
      return handleResponse(res, 404, "Package not found or inactive.");
    }

    return handleResponse(res, 200, "Package retrieved successfully", pkg);
  } catch (error) {
    logger.error("Error fetching public package by id:", error);
    return handleResponse(res, 500, error.message);
  }
};

