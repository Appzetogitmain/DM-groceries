import PlanFeature from "../../models/planFeature.js";
import SubscriptionPlan from "../../models/subscriptionPlan.js";
import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { buildSearchRegex } from "../../utils/regex.js";

// ========================================
// Plan Feature CRUD
// ========================================

export const createPlanFeature = async (req, res) => {
    try {
        const { name, description, code, status } = req.body;

        if (!name || !code) {
            return handleResponse(res, 400, "Feature name and code are required");
        }

        const existing = await PlanFeature.findOne({ code: code.toUpperCase().trim() });
        if (existing) {
            return handleResponse(res, 409, "A feature with this code already exists");
        }

        const feature = new PlanFeature({
            name: name.trim(),
            description: description || "",
            code: code.toUpperCase().trim(),
            status: status || "ACTIVE",
        });

        await feature.save();
        return handleResponse(res, 201, "Plan feature created successfully", feature);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getPlanFeatures = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status) query.status = status;

        if (search && search.trim()) {
            const safe = buildSearchRegex(search.trim(), { anchored: false });
            query.$or = [{ name: safe }, { code: safe }, { description: safe }];
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 50, maxLimit: 200 });

        const [features, total] = await Promise.all([
            PlanFeature.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            PlanFeature.countDocuments(query),
        ]);

        // For each feature, count how many active plans use it
        const featureIds = features.map((f) => f._id);
        const planCounts = await SubscriptionPlan.aggregate([
            { $match: { features: { $in: featureIds } } },
            { $unwind: "$features" },
            { $match: { features: { $in: featureIds } } },
            { $group: { _id: "$features", count: { $sum: 1 } } },
        ]);
        const countMap = {};
        planCounts.forEach((pc) => {
            countMap[pc._id.toString()] = pc.count;
        });

        const enriched = features.map((f) => ({
            ...f,
            usedInPlans: countMap[f._id.toString()] || 0,
        }));

        return handleResponse(res, 200, "Plan features fetched successfully", {
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

export const getPlanFeatureById = async (req, res) => {
    try {
        const feature = await PlanFeature.findById(req.params.id).lean();
        if (!feature) return handleResponse(res, 404, "Plan feature not found");
        return handleResponse(res, 200, "Plan feature fetched successfully", feature);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updatePlanFeature = async (req, res) => {
    try {
        const { name, description, code, status } = req.body;
        const update = {};

        if (name) update.name = name.trim();
        if (description !== undefined) update.description = description;
        if (status) update.status = status;

        // If code is being changed, check uniqueness
        if (code) {
            const upperCode = code.toUpperCase().trim();
            const existing = await PlanFeature.findOne({
                code: upperCode,
                _id: { $ne: req.params.id },
            });
            if (existing) {
                return handleResponse(res, 409, "A feature with this code already exists");
            }
            update.code = upperCode;
        }

        const feature = await PlanFeature.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!feature) return handleResponse(res, 404, "Plan feature not found");
        return handleResponse(res, 200, "Plan feature updated successfully", feature);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const togglePlanFeatureStatus = async (req, res) => {
    try {
        const feature = await PlanFeature.findById(req.params.id);
        if (!feature) return handleResponse(res, 404, "Plan feature not found");

        feature.status = feature.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        await feature.save();
        return handleResponse(res, 200, `Feature ${feature.status === "ACTIVE" ? "activated" : "deactivated"} successfully`, feature);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deletePlanFeature = async (req, res) => {
    try {
        const feature = await PlanFeature.findById(req.params.id);
        if (!feature) return handleResponse(res, 404, "Plan feature not found");

        // Prevent deletion if feature is used in any active plan
        const usedCount = await SubscriptionPlan.countDocuments({ features: feature._id });
        if (usedCount > 0) {
            return handleResponse(
                res,
                400,
                `Cannot delete feature — it is used in ${usedCount} plan(s). Deactivate it instead.`
            );
        }

        await PlanFeature.findByIdAndDelete(req.params.id);
        return handleResponse(res, 200, "Plan feature deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
