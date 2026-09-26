import SubscriptionPlan from "../../models/subscriptionPlan.js";
import PlanFeature from "../../models/planFeature.js";
import Subscription from "../../models/subscription.js";
import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { buildSearchRegex } from "../../utils/regex.js";

// ========================================
// Subscription Plan CRUD
// ========================================

export const createSubscriptionPlan = async (req, res) => {
    try {
        const { name, monthlyPrice, yearlyPrice, orderLimit, billingTypes, features, status } = req.body;

        if (!name || monthlyPrice === undefined || yearlyPrice === undefined) {
            return handleResponse(res, 400, "Plan name, monthly price, and yearly price are required");
        }

        // Validate features exist
        if (features && features.length > 0) {
            const validFeatures = await PlanFeature.find({ _id: { $in: features } }).select("_id").lean();
            if (validFeatures.length !== features.length) {
                return handleResponse(res, 400, "One or more selected features are invalid");
            }
        }

        const plan = new SubscriptionPlan({
            name: name.trim(),
            monthlyPrice,
            yearlyPrice,
            orderLimit: orderLimit === "" || orderLimit === undefined ? null : orderLimit,
            billingTypes: billingTypes || ["MONTHLY", "YEARLY"],
            features: features || [],
            status: status || "ACTIVE",
        });

        await plan.save();

        // Populate features for the response
        const populated = await SubscriptionPlan.findById(plan._id).populate("features").lean();
        return handleResponse(res, 201, "Subscription plan created successfully", populated);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriptionPlans = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status) query.status = status;

        if (search && search.trim()) {
            const safe = buildSearchRegex(search.trim(), { anchored: false });
            query.name = safe;
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

        const [plans, total] = await Promise.all([
            SubscriptionPlan.find(query)
                .populate("features")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SubscriptionPlan.countDocuments(query),
        ]);

        // For each plan, count active subscribers
        const planIds = plans.map((p) => p._id);
        const subscriberCounts = await Subscription.aggregate([
            { $match: { plan: { $in: planIds }, status: "ACTIVE" } },
            { $group: { _id: "$plan", count: { $sum: 1 } } },
        ]);
        const subCountMap = {};
        subscriberCounts.forEach((sc) => {
            subCountMap[sc._id.toString()] = sc.count;
        });

        const enriched = plans.map((p) => ({
            ...p,
            activeSubscribers: subCountMap[p._id.toString()] || 0,
        }));

        return handleResponse(res, 200, "Subscription plans fetched successfully", {
            items: enriched,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriptionPlanById = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id).populate("features").lean();
        if (!plan) return handleResponse(res, 404, "Subscription plan not found");
        return handleResponse(res, 200, "Subscription plan fetched successfully", plan);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateSubscriptionPlan = async (req, res) => {
    try {
        const { name, monthlyPrice, yearlyPrice, orderLimit, billingTypes, features, status } = req.body;
        const update = {};

        if (name) update.name = name.trim();
        if (monthlyPrice !== undefined) update.monthlyPrice = monthlyPrice;
        if (yearlyPrice !== undefined) update.yearlyPrice = yearlyPrice;
        if (orderLimit !== undefined) update.orderLimit = orderLimit === "" ? null : orderLimit;
        if (billingTypes) update.billingTypes = billingTypes;
        if (status) update.status = status;

        // Validate features exist
        if (features) {
            if (features.length > 0) {
                const validFeatures = await PlanFeature.find({ _id: { $in: features } }).select("_id").lean();
                if (validFeatures.length !== features.length) {
                    return handleResponse(res, 400, "One or more selected features are invalid");
                }
            }
            update.features = features;
        }

        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate("features");
        if (!plan) return handleResponse(res, 404, "Subscription plan not found");
        return handleResponse(res, 200, "Subscription plan updated successfully", plan);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const toggleSubscriptionPlanStatus = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return handleResponse(res, 404, "Subscription plan not found");

        plan.status = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        await plan.save();
        return handleResponse(
            res,
            200,
            `Plan ${plan.status === "ACTIVE" ? "activated" : "deactivated"} successfully`,
            plan
        );
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteSubscriptionPlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return handleResponse(res, 404, "Subscription plan not found");

        // Prevent deletion if plan has any subscriptions (active or historical)
        const usedCount = await Subscription.countDocuments({ plan: plan._id });
        if (usedCount > 0) {
            return handleResponse(
                res,
                400,
                `Cannot delete plan — it has ${usedCount} subscription(s). Deactivate it instead.`
            );
        }

        await SubscriptionPlan.findByIdAndDelete(req.params.id);
        return handleResponse(res, 200, "Subscription plan deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
