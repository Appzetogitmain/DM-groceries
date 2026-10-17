import Seller from "../../models/seller.js";
import Delivery from "../../models/delivery.js";
import handleResponse from "../../utils/helper.js";

// GET /admin/pending-counts
// Numbers behind the "waiting for review" badges in the admin sidebar.
export const getPendingCounts = async (req, res) => {
  try {
    const [sellers, deliveryApplications, deliveryDocuments, deliveryVehicles] = await Promise.all([
      // Same definition as the "Waiting for Review" sellers page.
      Seller.countDocuments({
        isVerified: { $ne: true },
        $or: [
          { applicationStatus: "pending" },
          { applicationStatus: { $exists: false } },
          { applicationStatus: null },
        ],
      }),
      // Same definition as the "Waiting for Review" drivers page (verified=false).
      Delivery.countDocuments({ isVerified: false }),
      Delivery.countDocuments({ "pendingDocuments.status": "pending" }),
      Delivery.countDocuments({ "pendingVehicleInfo.status": "pending" }),
    ]);

    return handleResponse(res, 200, "Pending counts fetched", {
      sellers,
      deliveryApplications,
      deliveryDocuments,
      deliveryVehicles,
      delivery: deliveryApplications + deliveryDocuments + deliveryVehicles,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
