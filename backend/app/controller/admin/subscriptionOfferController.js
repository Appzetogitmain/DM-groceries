import SubscriptionOffer from "../../models/subscriptionOffer.js";
import SubscriptionPlan from "../../models/subscriptionPlan.js";
import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import { buildSearchRegex } from "../../utils/regex.js";

// ========================================
// Subscription Offer CRUD
// ========================================

export const createSubscriptionOffer = async (req, res) => {
    try {
        const { name, offerType, plan, discountType, discountValue, startDate, endDate, description, status } = req.body;

        if (!name || !plan || !discountType || discountValue === undefined || !startDate || !endDate) {
            return handleResponse(res, 400, "Name, plan, discount type, discount value, start date and end date are required");
        }

        // Validate plan exists
        const planDoc = await SubscriptionPlan.findById(plan);
        if (!planDoc) {
            return handleResponse(res, 404, "Selected plan not found");
        }

        // Validate discount value
        if (discountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
            return handleResponse(res, 400, "Percentage discount must be between 0 and 100");
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return handleResponse(res, 400, "End date must be after start date");
        }

        // Determine initial status based on dates if not provided
        let offerStatus = status;
        if (!offerStatus) {
            const now = new Date();
            if (now < start) {
                offerStatus = "SCHEDULED";
            } else if (now >= start && now <= end) {
                offerStatus = "ACTIVE";
            } else {
                offerStatus = "EXPIRED";
            }
        }

        const offer = new SubscriptionOffer({
            name: name.trim(),
            offerType: offerType || "PLAN_DISCOUNT",
            plan,
            discountType,
            discountValue,
            startDate: start,
            endDate: end,
            description: description || "",
            status: offerStatus,
        });

        await offer.save();

        const populated = await SubscriptionOffer.findById(offer._id).populate("plan", "name monthlyPrice yearlyPrice").lean();
        return handleResponse(res, 201, "Subscription offer created successfully", populated);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriptionOffers = async (req, res) => {
    try {
        const { status, search, plan } = req.query;
        const query = {};

        if (status) query.status = status;
        if (plan) query.plan = plan;

        if (search && search.trim()) {
            const safe = buildSearchRegex(search.trim(), { anchored: false });
            query.$or = [{ name: safe }, { description: safe }];
        }

        const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

        const [offers, total] = await Promise.all([
            SubscriptionOffer.find(query)
                .populate("plan", "name monthlyPrice yearlyPrice")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SubscriptionOffer.countDocuments(query),
        ]);

        return handleResponse(res, 200, "Subscription offers fetched successfully", {
            items: offers,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const getSubscriptionOfferById = async (req, res) => {
    try {
        const offer = await SubscriptionOffer.findById(req.params.id)
            .populate("plan", "name monthlyPrice yearlyPrice")
            .lean();
        if (!offer) return handleResponse(res, 404, "Subscription offer not found");
        return handleResponse(res, 200, "Subscription offer fetched successfully", offer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const updateSubscriptionOffer = async (req, res) => {
    try {
        const { name, offerType, plan, discountType, discountValue, startDate, endDate, description, status } = req.body;
        const update = {};

        if (name) update.name = name.trim();
        if (offerType) update.offerType = offerType;
        if (discountType) update.discountType = discountType;
        if (discountValue !== undefined) update.discountValue = discountValue;
        if (description !== undefined) update.description = description;
        if (status) update.status = status;

        if (plan) {
            const planDoc = await SubscriptionPlan.findById(plan);
            if (!planDoc) return handleResponse(res, 404, "Selected plan not found");
            update.plan = plan;
        }

        // Validate discount value
        const finalDiscountType = discountType || (await SubscriptionOffer.findById(req.params.id).select("discountType").lean())?.discountType;
        if (discountValue !== undefined && finalDiscountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
            return handleResponse(res, 400, "Percentage discount must be between 0 and 100");
        }

        if (startDate) update.startDate = new Date(startDate);
        if (endDate) update.endDate = new Date(endDate);

        // Validate dates if both provided
        if (update.startDate && update.endDate && update.endDate <= update.startDate) {
            return handleResponse(res, 400, "End date must be after start date");
        }

        const offer = await SubscriptionOffer.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate("plan", "name monthlyPrice yearlyPrice");
        if (!offer) return handleResponse(res, 404, "Subscription offer not found");
        return handleResponse(res, 200, "Subscription offer updated successfully", offer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const toggleSubscriptionOfferStatus = async (req, res) => {
    try {
        const offer = await SubscriptionOffer.findById(req.params.id);
        if (!offer) return handleResponse(res, 404, "Subscription offer not found");

        if (offer.status === "ACTIVE") {
            offer.status = "INACTIVE";
        } else if (offer.status === "INACTIVE" || offer.status === "SCHEDULED") {
            // Check if dates are still valid
            const now = new Date();
            if (now > offer.endDate) {
                return handleResponse(res, 400, "Cannot activate an expired offer. Update the dates first.");
            }
            offer.status = "ACTIVE";
        } else {
            return handleResponse(res, 400, "Cannot change status of an expired offer");
        }

        await offer.save();
        return handleResponse(res, 200, `Offer ${offer.status === "ACTIVE" ? "activated" : "deactivated"} successfully`, offer);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteSubscriptionOffer = async (req, res) => {
    try {
        const offer = await SubscriptionOffer.findById(req.params.id);
        if (!offer) return handleResponse(res, 404, "Subscription offer not found");

        await SubscriptionOffer.findByIdAndDelete(req.params.id);
        return handleResponse(res, 200, "Subscription offer deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
