import Seller from "../../models/seller.js";
import Delivery from "../../models/delivery.js";
import Product from "../../models/product.js";
import Transaction from "../../models/transaction.js";
import Ticket from "../../models/ticket.js";
import ContactMessage from "../../models/contactMessage.js";
import handleResponse from "../../utils/helper.js";

// GET /admin/pending-counts
// Numbers behind the notification badges in the admin sidebar.
export const getPendingCounts = async (req, res) => {
  try {
    const [
      sellers,
      deliveryApplications,
      deliveryDocuments,
      deliveryVehicles,
      products,
      sellerWithdrawals,
      deliveryWithdrawals,
      supportTickets,
      contactMessages,
      latestTransaction,
    ] = await Promise.all([
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
      // Products awaiting moderation approval
      Product.countDocuments({
        approvalStatus: { $in: ["pending", "PENDING"] },
      }),
      // Pending withdrawal requests
      Transaction.countDocuments({
        userModel: "Seller",
        type: "Withdrawal",
        status: { $in: ["Pending", "pending"] },
      }),
      Transaction.countDocuments({
        userModel: "Delivery",
        type: "Withdrawal",
        status: { $in: ["Pending", "pending"] },
      }),
      // Open / in-progress support tickets
      Ticket.countDocuments({
        status: { $in: ["open", "processing"] },
      }),
      // New / unread contact form inquiries
      ContactMessage.countDocuments({
        status: "new",
      }),
      // Most recent transaction for wallet new entry detection
      Transaction.findOne({})
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean(),
    ]);

    const totalWithdrawals = Number(sellerWithdrawals || 0) + Number(deliveryWithdrawals || 0);
    const totalSupport = Number(supportTickets || 0) + Number(contactMessages || 0);

    return handleResponse(res, 200, "Pending counts fetched", {
      sellers,
      deliveryApplications,
      deliveryDocuments,
      deliveryVehicles,
      delivery: deliveryApplications + deliveryDocuments + deliveryVehicles,
      products,
      sellerWithdrawals,
      deliveryWithdrawals,
      withdrawals: totalWithdrawals,
      supportTickets,
      contactMessages,
      support: totalSupport,
      latestTransactionTime: latestTransaction?.createdAt || null,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

