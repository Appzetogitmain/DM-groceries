import express from "express";
import {
    createPlanFeature,
    getPlanFeatures,
    getPlanFeatureById,
    updatePlanFeature,
    togglePlanFeatureStatus,
    deletePlanFeature,
} from "../controller/admin/planFeatureController.js";
import {
    createSubscriptionPlan,
    getSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    toggleSubscriptionPlanStatus,
    deleteSubscriptionPlan,
} from "../controller/admin/subscriptionPlanController.js";
import {
    createSubscriptionOffer,
    getSubscriptionOffers,
    getSubscriptionOfferById,
    updateSubscriptionOffer,
    toggleSubscriptionOfferStatus,
    deleteSubscriptionOffer,
} from "../controller/admin/subscriptionOfferController.js";
import {
    getSubscribers,
    getSubscriberById,
    getSubscriptionStats,
} from "../controller/admin/subscriberController.js";
import { verifyToken, allowRoles, requirePermission } from "../middleware/authMiddleware.js";

const router = express.Router();

// Common middleware stack for all admin subscription routes
const adminAuth = [verifyToken, allowRoles("admin")];
const viewPerm = requirePermission("subscriptions", "view");
const createPerm = requirePermission("subscriptions", "create");
const deletePerm = requirePermission("subscriptions", "delete");

// ========================================
// Plan Features
// ========================================
router.get("/features", ...adminAuth, viewPerm, getPlanFeatures);
router.get("/features/:id", ...adminAuth, viewPerm, getPlanFeatureById);
router.post("/features", ...adminAuth, createPerm, createPlanFeature);
router.put("/features/:id", ...adminAuth, createPerm, updatePlanFeature);
router.patch("/features/:id/status", ...adminAuth, createPerm, togglePlanFeatureStatus);
router.delete("/features/:id", ...adminAuth, deletePerm, deletePlanFeature);

// ========================================
// Subscription Plans
// ========================================
router.get("/plans", ...adminAuth, viewPerm, getSubscriptionPlans);
router.get("/plans/:id", ...adminAuth, viewPerm, getSubscriptionPlanById);
router.post("/plans", ...adminAuth, createPerm, createSubscriptionPlan);
router.put("/plans/:id", ...adminAuth, createPerm, updateSubscriptionPlan);
router.patch("/plans/:id/status", ...adminAuth, createPerm, toggleSubscriptionPlanStatus);
router.delete("/plans/:id", ...adminAuth, deletePerm, deleteSubscriptionPlan);

// ========================================
// Subscription Offers
// ========================================
router.get("/offers", ...adminAuth, viewPerm, getSubscriptionOffers);
router.get("/offers/:id", ...adminAuth, viewPerm, getSubscriptionOfferById);
router.post("/offers", ...adminAuth, createPerm, createSubscriptionOffer);
router.put("/offers/:id", ...adminAuth, createPerm, updateSubscriptionOffer);
router.patch("/offers/:id/status", ...adminAuth, createPerm, toggleSubscriptionOfferStatus);
router.delete("/offers/:id", ...adminAuth, deletePerm, deleteSubscriptionOffer);

// ========================================
// Subscribers
// ========================================
router.get("/subscribers", ...adminAuth, viewPerm, getSubscribers);
router.get("/subscribers/stats", ...adminAuth, viewPerm, getSubscriptionStats);
router.get("/subscribers/:id", ...adminAuth, viewPerm, getSubscriberById);

export default router;
