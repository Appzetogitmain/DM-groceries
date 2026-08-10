import express from "express";
import {
  verifyToken,
  allowRoles,
  requireApprovedSeller,
} from "../middleware/authMiddleware.js";
import {
  lookupCustomer,
  createPosOrder,
  getPosOrdersList,
  getPosOrderDetail,
  searchPosProducts,
  getPosStats,
} from "../controller/posController.js";

const router = express.Router();

// All POS routes require seller authentication and approval
router.use(verifyToken, allowRoles("seller", "admin"), requireApprovedSeller);

// Customer lookup
router.post("/customer/lookup", lookupCustomer);

// Order creation and retrieval
router.post("/order", createPosOrder);
router.get("/orders", getPosOrdersList);
router.get("/orders/:id", getPosOrderDetail);

// Products and stats
router.get("/products", searchPosProducts);
router.get("/stats", getPosStats);

export default router;
