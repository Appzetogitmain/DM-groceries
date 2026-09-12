import express from "express";
import {
    bootstrapAdmin,
    signupAdmin,
    loginAdmin,
} from "../controller/adminAuthController.js";
import {
    getAdminProfile,
    updateAdminProfile,
    updateAdminPassword,
    getAdminStats,
    getDeliveryPartners,
    approveDeliveryPartner,
    rejectDeliveryPartner,
    getActiveFleet,
    getAdminWalletData,
    getDeliveryTransactions,
    settleTransaction,
    bulkSettleDelivery,
    getActiveSellers,
    getPendingSellers,
    approveSellerApplication,
    rejectSellerApplication,
    getSellerWithdrawals,
    getDeliveryWithdrawals,
    updateWithdrawalStatus,
    getSellerTransactions,
    getDeliveryCashBalances,
    getRiderCashDetails,
    settleRiderCash,
    getCashSettlementHistory,
    getUsers,
    getUserById,
    getSellers,
    getSellerLocations,
    getPlatformSettings,
    updatePlatformSettings
} from "../controller/adminController.js";
import {
    exportAdminFinanceStatementController,
    getAdminFinanceLedgerController,
    getAdminFinancePayoutsController,
    getAdminFinanceSummaryController,
    getDeliverySettingsController,
    processAdminFinancePayoutsController,
    updateDeliverySettingsController,
    getAdminFinanceAnalyticsController,
    getAdminFinanceDrilldownController,
} from "../controller/adminFinanceController.js";
import { getTodayBirthdays, sendReward, getBirthdayAnalytics } from "../controller/admin/adminBirthdayController.js";
import {
    sendSubAdminInviteOtp,
    verifySubAdminEmail,
    createSubAdmin,
    getSubAdmins,
    getSubAdminById,
    updateSubAdmin,
    toggleSubAdminStatus,
    deleteSubAdmin,
    resetSubAdminPassword,
    getPermissionsMap,
} from "../controller/admin/subAdminController.js";

import { verifyToken, allowRoles, requirePermission, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
    adminBootstrapRateLimiter,
    authRouteRateLimiter,
    createContentLengthGuard,
} from "../middleware/securityMiddlewares.js";

const router = express.Router();

const smallAdminPayload = createContentLengthGuard(
    parseInt(process.env.ADMIN_AUTH_MAX_PAYLOAD_BYTES || "20480", 10),
    "Admin auth payload too large",
);
router.post("/bootstrap", adminBootstrapRateLimiter, smallAdminPayload, bootstrapAdmin);
router.post("/signup", adminBootstrapRateLimiter, smallAdminPayload, signupAdmin);
router.post("/login", authRouteRateLimiter, smallAdminPayload, loginAdmin);

// Profile routes (accessible by both super and sub admins)
router.get(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    getAdminProfile
);

router.put(
    "/profile",
    verifyToken,
    allowRoles("admin"),
    updateAdminProfile
);

router.put(
    "/profile/password",
    verifyToken,
    allowRoles("admin"),
    updateAdminPassword
);

// ========================================
// Sub Admin Management (Super Admin only)
// ========================================
router.get("/sub-admins/permissions-map", verifyToken, allowRoles("admin"), requireSuperAdmin, getPermissionsMap);
router.post("/sub-admins/send-invite-otp", verifyToken, allowRoles("admin"), requireSuperAdmin, sendSubAdminInviteOtp);
router.post("/sub-admins/verify-email", verifyToken, allowRoles("admin"), requireSuperAdmin, verifySubAdminEmail);
router.post("/sub-admins/create", verifyToken, allowRoles("admin"), requireSuperAdmin, createSubAdmin);
router.get("/sub-admins", verifyToken, allowRoles("admin"), requireSuperAdmin, getSubAdmins);
router.get("/sub-admins/:id", verifyToken, allowRoles("admin"), requireSuperAdmin, getSubAdminById);
router.put("/sub-admins/:id", verifyToken, allowRoles("admin"), requireSuperAdmin, updateSubAdmin);
router.patch("/sub-admins/:id/toggle-status", verifyToken, allowRoles("admin"), requireSuperAdmin, toggleSubAdminStatus);
router.delete("/sub-admins/:id", verifyToken, allowRoles("admin"), requireSuperAdmin, deleteSubAdmin);
router.post("/sub-admins/:id/reset-password", verifyToken, allowRoles("admin"), requireSuperAdmin, resetSubAdminPassword);

// ========================================
// Dashboard & Stats
// ========================================
router.get(
    "/stats",
    verifyToken,
    allowRoles("admin"),
    requirePermission("dashboard", "view"),
    getAdminStats
);

// ========================================
// Finance
// ========================================
router.get(
    "/finance/summary",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    getAdminFinanceSummaryController,
);
router.get(
    "/finance/analytics",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    getAdminFinanceAnalyticsController,
);
router.get(
    "/finance/ledger",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    getAdminFinanceLedgerController,
);
router.get(
    "/finance/drilldown",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    getAdminFinanceDrilldownController,
);
router.get(
    "/finance/payouts",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    getAdminFinancePayoutsController,
);
router.post(
    "/finance/payouts/process",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "create"),
    processAdminFinancePayoutsController,
);
router.get(
    "/finance/export-statement",
    verifyToken,
    allowRoles("admin"),
    requirePermission("wallet", "view"),
    exportAdminFinanceStatementController,
);

// ========================================
// Settings
// ========================================
router.get(
    "/settings/platform",
    verifyToken,
    allowRoles("admin"),
    requirePermission("settings", "view"),
    getPlatformSettings
);
router.get(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    requirePermission("settings", "view"),
    getDeliverySettingsController,
);
router.put(
    "/settings/delivery",
    verifyToken,
    allowRoles("admin"),
    requirePermission("settings", "create"),
    updateDeliverySettingsController,
);
router.put(
    "/settings/platform",
    verifyToken,
    allowRoles("admin"),
    requirePermission("settings", "create"),
    updatePlatformSettings
);

// ========================================
// Users & Customers
// ========================================
router.get("/users", verifyToken, allowRoles("admin"), requirePermission("customers", "view"), getUsers);
router.get("/users/:id", verifyToken, allowRoles("admin"), requirePermission("customers", "view"), getUserById);

// ========================================
// Sellers
// ========================================
router.get("/sellers", verifyToken, allowRoles("admin"), requirePermission("sellers", "view"), getSellers);
router.get("/sellers/locations", verifyToken, allowRoles("admin"), requirePermission("sellers", "view"), getSellerLocations);
router.get("/sellers/active", verifyToken, allowRoles("admin"), requirePermission("sellers", "view"), getActiveSellers);
router.get("/sellers/pending", verifyToken, allowRoles("admin"), requirePermission("sellers", "view"), getPendingSellers);
router.patch("/sellers/approve/:id", verifyToken, allowRoles("admin"), requirePermission("sellers", "create"), approveSellerApplication);
router.delete("/sellers/reject/:id", verifyToken, allowRoles("admin"), requirePermission("sellers", "delete"), rejectSellerApplication);

// ========================================
// Delivery Partners
// ========================================
router.get(
    "/delivery-partners",
    verifyToken,
    allowRoles("admin"),
    requirePermission("delivery", "view"),
    getDeliveryPartners
);

router.patch(
    "/delivery-partners/approve/:id",
    verifyToken,
    allowRoles("admin"),
    requirePermission("delivery", "create"),
    approveDeliveryPartner
);

router.delete(
    "/delivery-partners/reject/:id",
    verifyToken,
    allowRoles("admin"),
    requirePermission("delivery", "delete"),
    rejectDeliveryPartner
);

router.get("/active-fleet", verifyToken, allowRoles("admin"), requirePermission("delivery", "view"), getActiveFleet);

// ========================================
// Wallet
// ========================================
router.get("/wallet-data", verifyToken, allowRoles("admin"), requirePermission("wallet", "view"), getAdminWalletData);

// ========================================
// Delivery Payouts / Funds
// ========================================
router.get("/delivery-transactions", verifyToken, allowRoles('admin'), requirePermission("delivery", "view"), getDeliveryTransactions);
router.put("/transactions/:id/settle", verifyToken, allowRoles("admin"), requirePermission("delivery", "create"), settleTransaction);
router.put("/transactions/bulk-settle-delivery", verifyToken, allowRoles("admin"), requirePermission("delivery", "create"), bulkSettleDelivery);

// ========================================
// Cash Collection Hub
// ========================================
router.get("/delivery-cash", verifyToken, allowRoles("admin"), requirePermission("cash_collection", "view"), getDeliveryCashBalances);
router.get("/rider-cash-details/:id", verifyToken, allowRoles("admin"), requirePermission("cash_collection", "view"), getRiderCashDetails);
router.post("/settle-cash", verifyToken, allowRoles("admin"), requirePermission("cash_collection", "create"), settleRiderCash);
router.get("/cash-history", verifyToken, allowRoles("admin"), requirePermission("cash_collection", "view"), getCashSettlementHistory);

// ========================================
// Seller Withdrawal Management
// ========================================
router.get("/seller-withdrawals", verifyToken, allowRoles("admin"), requirePermission("withdrawals", "view"), getSellerWithdrawals);
router.get("/delivery-withdrawals", verifyToken, allowRoles("admin"), requirePermission("withdrawals", "view"), getDeliveryWithdrawals);
router.get("/seller-transactions", verifyToken, allowRoles("admin"), requirePermission("seller_transactions", "view"), getSellerTransactions);
router.put("/withdrawals/:id", verifyToken, allowRoles("admin"), requirePermission("withdrawals", "create"), updateWithdrawalStatus);

// ========================================
// Dashboard
// ========================================
router.get(
    "/dashboard",
    verifyToken,
    allowRoles("admin"),
    requirePermission("dashboard", "view"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome to Admin Dashboard",
        });
    }
);

// ========================================
// Birthdays (Customer section)
// ========================================
router.get("/birthdays/today", verifyToken, allowRoles("admin"), requirePermission("customers", "view"), getTodayBirthdays);
router.post("/birthdays/reward", verifyToken, allowRoles("admin"), requirePermission("customers", "create"), sendReward);
router.get("/birthdays/analytics", verifyToken, allowRoles("admin"), requirePermission("customers", "view"), getBirthdayAnalytics);

export default router;
