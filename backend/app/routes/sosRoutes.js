import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import { triggerSos, getActiveSosAlerts, resolveSosAlert, getResolvedSosAlerts } from "../controller/sosController.js";

const router = express.Router();

// Delivery Routes
router.post("/delivery/sos", verifyToken, allowRoles("delivery"), triggerSos);

// Admin Routes
router.get("/admin/sos", verifyToken, allowRoles("admin", "superadmin"), getActiveSosAlerts);
router.get("/admin/sos/history", verifyToken, allowRoles("admin", "superadmin"), getResolvedSosAlerts);
router.put("/admin/sos/:id/resolve", verifyToken, allowRoles("admin", "superadmin"), resolveSosAlert);

export default router;
