import SosAlert from "../models/sosAlert.js";
import Delivery from "../models/delivery.js";
import { getIO } from "../socket/socketManager.js";
import { handleResponse } from "../utils/helper.js";

// Delivery: Trigger SOS
export const triggerSos = async (req, res) => {
    try {
        const deliveryId = req.user.id;
        const { location } = req.body;

        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) {
            return handleResponse(res, 404, "Delivery partner not found");
        }

        const newAlert = new SosAlert({
            deliveryId,
            location: location || delivery.location || { type: "Point", coordinates: [0, 0] },
            emergencyContacts: delivery.emergencyContacts || [],
            status: "active"
        });

        await newAlert.save();
        await newAlert.populate("deliveryId", "name phone profileImage vehicleNumber");

        // Emit socket event to admins
        const io = getIO();
        if (io) {
            io.to("admin").emit("sos-alert-triggered", newAlert);
        }

        return handleResponse(res, 201, "SOS Alert triggered successfully", newAlert);
    } catch (error) {
        console.error("SOS Trigger Error:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};

// Admin: Get all active SOS alerts
export const getActiveSosAlerts = async (req, res) => {
    try {
        const alerts = await SosAlert.find({ status: "active" })
            .populate("deliveryId", "name phone profileImage vehicleNumber")
            .sort({ createdAt: -1 });

        return handleResponse(res, 200, "Active SOS alerts fetched", alerts);
    } catch (error) {
        return handleResponse(res, 500, "Internal Server Error");
    }
};

// Admin: Resolve SOS alert
export const resolveSosAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, status } = req.body; // status can be "resolved" or "false_alarm"

        const alert = await SosAlert.findById(id);
        if (!alert) {
            return handleResponse(res, 404, "SOS Alert not found");
        }

        alert.status = status || "resolved";
        alert.resolvedBy = req.user.id;
        alert.resolvedAt = new Date();
        if (notes) alert.notes = notes;

        await alert.save();
        await alert.populate("deliveryId", "name phone profileImage vehicleNumber");
        await alert.populate("resolvedBy", "name email");

        // Notify admins that it was resolved
        const io = getIO();
        if (io) {
            io.to("admin").emit("sos-alert-resolved", alert);
        }

        return handleResponse(res, 200, "SOS Alert resolved", alert);
    } catch (error) {
        return handleResponse(res, 500, "Internal Server Error");
    }
};

// Admin: Get resolved SOS alerts
export const getResolvedSosAlerts = async (req, res) => {
    try {
        const alerts = await SosAlert.find({ status: { $ne: "active" } })
            .populate("deliveryId", "name phone profileImage vehicleNumber")
            .populate("resolvedBy", "name email")
            .sort({ resolvedAt: -1 });

        return handleResponse(res, 200, "Resolved SOS alerts fetched", alerts);
    } catch (error) {
        return handleResponse(res, 500, "Internal Server Error");
    }
};
