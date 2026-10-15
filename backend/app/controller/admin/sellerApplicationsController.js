import handleResponse from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import Seller from "../../models/seller.js";
import { notifySellerRejected } from "../../services/sellerRejectionNotifier.js";
import { emitNotificationEvent } from "../../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../../modules/notifications/notification.constants.js";
import {
  approveSellerApplicationById,
  getPendingSellerApplications,
  rejectSellerApplicationById,
} from "../../services/admin/sellerApplicationService.js";

export const getPendingSellers = async (req, res) => {
  try {
    const { q = "", status = "pending" } = req.query;
    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 100,
    });

    const data = await getPendingSellerApplications({
      q,
      status,
      page,
      limit,
      skip,
    });

    return handleResponse(res, 200, "Pending seller applications fetched", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveSellerApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await approveSellerApplicationById({
      sellerId: id,
      reviewedBy: req.user.id,
    });

    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    emitNotificationEvent(NOTIFICATION_EVENTS.SELLER_STORE_APPROVED, {
      sellerId: id,
      title: "Account Approved ✅",
      message: "Congratulations! Your seller account has been approved. You can now log in and start selling.",
      // Unique per decision so approve → reject → approve is never deduped away.
      messageId: `store-approved:${id}:${Date.now()}`,
      data: { link: "/seller" },
    });

    return handleResponse(res, 200, "Seller approved successfully", seller);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectSellerApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim().slice(0, 300);

    // The seller is told why they were rejected, so a reason is required.
    if (!reason) {
      return handleResponse(res, 400, "Please enter the reason for rejecting this application");
    }

    // This endpoint is also used to remove an already-active seller. Only an application that
    // was still waiting for approval gets the "not approved" notification, email and SMS.
    const before = await Seller.findById(id).select("isVerified applicationStatus").lean();
    const wasApplication = !!before && before.isVerified !== true && before.applicationStatus !== "approved";

    const seller = await rejectSellerApplicationById({
      sellerId: id,
      reviewedBy: req.user.id,
      reason,
    });

    if (!seller) {
      return handleResponse(res, 404, "Seller not found");
    }

    let delivery = null;
    if (wasApplication) {
      emitNotificationEvent(NOTIFICATION_EVENTS.SELLER_STORE_REJECTED, {
        sellerId: id,
        title: "Application Not Approved",
        message: `Your seller application was not approved. Reason: ${reason}`,
        messageId: `store-rejected:${id}:${Date.now()}`,
      });

      // Email + SMS with the reason. Never blocks or fails the rejection itself.
      delivery = await notifySellerRejected(id, reason);
    }

    return handleResponse(res, 200, "Seller application rejected", { ...seller, delivery });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
