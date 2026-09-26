import Subscription from "../../models/subscription.js";
import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { buildSearchRegex } from "../../utils/regex.js";

// ========================================
// Admin Subscriber Management
// ========================================

export const getSubscribers = async (req, res) => {
    try {
        const { status, plan, search } = req.query;
        const query = {};

        if (status) query.status = status;
        if (plan) query.plan = plan;

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

        // Build base query
        let subscriptionQuery = Subscription.find(query)
            .populate("seller", "name shopName email phone")
            .populate({
                path: "plan",
                populate: { path: "features", select: "name code status" },
            })
            .populate("offer", "name discountType discountValue")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const [subscriptions, total] = await Promise.all([
            subscriptionQuery.lean(),
            Subscription.countDocuments(query),
        ]);

        // If search is provided, filter by seller name/shopName after populate
        let filtered = subscriptions;
        if (search && search.trim()) {
            const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filtered = subscriptions.filter(
                (s) =>
                    regex.test(s.seller?.name || "") ||
                    regex.test(s.seller?.shopName || "") ||
                    regex.test(s.seller?.email || "")
            );
        }

        return handleResponse(res, 200, "Subscribers fetched successfully", {
            items: filtered,
            page,
            limit,
            total: search ? filtered.length : total,
            totalPages: Math.ceil((search ? filtered.length : total) / limit) || 1,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriberById = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id)
            .populate("seller", "name shopName email phone address")
            .populate({
                path: "plan",
                populate: { path: "features", select: "name code status" },
            })
            .populate("offer", "name discountType discountValue")
            .lean();

        if (!subscription) return handleResponse(res, 404, "Subscription not found");
        return handleResponse(res, 200, "Subscription fetched successfully", subscription);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriptionStats = async (req, res) => {
    try {
        const [
            totalActive,
            totalExpired,
            totalPending,
            totalCancelled,
        ] = await Promise.all([
            Subscription.countDocuments({ status: "ACTIVE" }),
            Subscription.countDocuments({ status: "EXPIRED" }),
            Subscription.countDocuments({ status: "PENDING" }),
            Subscription.countDocuments({ status: "CANCELLED" }),
        ]);

        // Revenue from successful subscriptions
        const revenueAgg = await Subscription.aggregate([
            { $match: { status: { $in: ["ACTIVE", "EXPIRED"] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalAmount" },
                    totalDiscount: { $sum: "$discountAmount" },
                },
            },
        ]);

        const revenue = revenueAgg[0] || { totalRevenue: 0, totalDiscount: 0 };

        return handleResponse(res, 200, "Subscription stats fetched successfully", {
            totalActive,
            totalExpired,
            totalPending,
            totalCancelled,
            totalRevenue: revenue.totalRevenue,
            totalDiscount: revenue.totalDiscount,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
