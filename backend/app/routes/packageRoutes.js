import express from "express";
import multer from "multer";
import {
  getAdminPackageSettings,
  updateAdminPackageSettings,
  getAdminPackages,
  getAdminPackageById,
  approvePackage,
  rejectPackage,
  getSellerPackageQuota,
  getSellerPackages,
  getEligibleProductsForPackage,
  getSellerPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageStatus,
  getPublicPackages,
  getPublicPackageById,
} from "../controller/packageController.js";
import {
  verifyToken,
  optionalVerifyToken,
  allowRoles,
  requireApprovedSeller,
} from "../middleware/authMiddleware.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// ==========================================
// ADMIN ROUTES
// ==========================================
router.get("/admin/settings", verifyToken, allowRoles("admin"), getAdminPackageSettings);
router.put("/admin/settings", verifyToken, allowRoles("admin"), updateAdminPackageSettings);
router.get("/admin", verifyToken, allowRoles("admin"), getAdminPackages);
router.get("/admin/:id", verifyToken, allowRoles("admin"), getAdminPackageById);
router.patch("/admin/:id/approve", verifyToken, allowRoles("admin"), approvePackage);
router.patch("/admin/:id/reject", verifyToken, allowRoles("admin"), rejectPackage);

// ==========================================
// SELLER ROUTES
// ==========================================
router.get(
  "/seller/quota",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  getSellerPackageQuota
);
router.get(
  "/seller/eligible-products",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  getEligibleProductsForPackage
);
router.get(
  "/seller",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  getSellerPackages
);
router.get(
  "/seller/:id",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  getSellerPackageById
);
router.post(
  "/seller",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  upload.any(),
  createPackage
);
router.put(
  "/seller/:id",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  upload.any(),
  updatePackage
);
router.delete(
  "/seller/:id",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  deletePackage
);
router.patch(
  "/seller/:id/toggle-status",
  verifyToken,
  allowRoles("seller"),
  requireApprovedSeller,
  togglePackageStatus
);

// ==========================================
// PUBLIC / CUSTOMER ROUTES
// ==========================================
router.get("/public", optionalVerifyToken, getPublicPackages);
router.get("/public/:id", optionalVerifyToken, getPublicPackageById);

export default router;

