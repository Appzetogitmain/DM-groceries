import express from "express";
import {
    signupSeller,
    loginSeller,
    sendSellerSignupOtp,
    verifySellerSignupOtp,
    sendSellerResetOtp,
    verifySellerResetOtp,
    resetSellerPassword,
    checkSellerExists,
} from "../controller/sellerAuthController.js";
import { getSellerProfile, updateSellerProfile, requestWithdrawal, getNearbySellers } from "../controller/sellerController.js";
import { getSellerStats, getSellerEarnings } from "../controller/sellerStatsController.js";
import { getSellerWalletSummaryController } from "../controller/adminFinanceController.js";
import {
    getAvailablePlans,
    getCurrentSubscription,
    getActiveOffers,
    getSubscriptionHistory,
    createSubscriptionOrder,
    verifySubscriptionPayment,
    getPaymentHistory,
} from "../controller/seller/sellerSubscriptionController.js";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import requireFeature from "../middleware/subscriptionMiddleware.js";
import {
    authRouteRateLimiter,
    createContentLengthGuard,
    otpRouteRateLimiter,
} from "../middleware/securityMiddlewares.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const sellerOtpPayloadGuard = createContentLengthGuard(
    parseInt(process.env.AUTH_MAX_PAYLOAD_BYTES || "16384", 10),
    "Verification payload too large",
);

router.post(
    "/verification/send-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    sendSellerSignupOtp
);
router.post(
    "/verification/verify-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    verifySellerSignupOtp
);

// Forgot / Reset Password
router.post(
    "/forgot-password/send-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    sendSellerResetOtp
);
router.post(
    "/forgot-password/verify-otp",
    authRouteRateLimiter,
    otpRouteRateLimiter,
    sellerOtpPayloadGuard,
    verifySellerResetOtp
);
router.post(
    "/reset-password",
    authRouteRateLimiter,
    sellerOtpPayloadGuard,
    resetSellerPassword
);

router.post(
    "/signup",
    upload.any(),
    signupSeller
);
router.post("/check-exists", checkSellerExists);
router.post("/login", loginSeller);
router.get("/nearby", getNearbySellers);

// Profile routes
router.get(
    "/profile",
    verifyToken,
    allowRoles("seller"),
    getSellerProfile
);

router.put(
    "/profile",
    verifyToken,
    allowRoles("seller"),
    updateSellerProfile
);

// Analytics & Financials
router.get("/stats", verifyToken, allowRoles("seller"), requireFeature("ANALYTICS_REPORTS"), getSellerStats);
router.get("/earnings", verifyToken, allowRoles("seller"), requireFeature("ANALYTICS_REPORTS"), getSellerEarnings);
router.get("/wallet/summary", verifyToken, allowRoles("seller"), requireFeature("MONEY_WITHDRAWAL"), getSellerWalletSummaryController);
router.post("/request-withdrawal", verifyToken, allowRoles("seller"), requireFeature("MONEY_WITHDRAWAL"), requestWithdrawal);

// ========================================
// Subscription
// ========================================
router.get("/subscriptions/plans", verifyToken, allowRoles("seller"), getAvailablePlans);
router.get("/subscriptions/current", verifyToken, allowRoles("seller"), getCurrentSubscription);
router.get("/subscriptions/offers", verifyToken, allowRoles("seller"), getActiveOffers);
router.get("/subscriptions/history", verifyToken, allowRoles("seller"), getSubscriptionHistory);
router.post("/subscriptions/create-order", verifyToken, allowRoles("seller"), createSubscriptionOrder);
router.post("/subscriptions/verify-payment", verifyToken, allowRoles("seller"), verifySubscriptionPayment);
router.get("/subscriptions/payments", verifyToken, allowRoles("seller"), getPaymentHistory);

export default router;
