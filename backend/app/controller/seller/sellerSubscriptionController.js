import SubscriptionPlan from "../../models/subscriptionPlan.js";
import SubscriptionOffer from "../../models/subscriptionOffer.js";
import Subscription from "../../models/subscription.js";
import SubscriptionPayment from "../../models/subscriptionPayment.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { handleResponse } from "../../utils/helper.js";
import logger from "../../services/logger.js";

// ========================================
// Lazily-built Razorpay client
// ========================================
let _rzpClient = null;

function getRazorpay() {
    if (_rzpClient) return _rzpClient;
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
    _rzpClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return _rzpClient;
}

// ========================================
// Seller: View Available Plans
// ========================================
export const getAvailablePlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ status: "ACTIVE" })
            .populate("features")
            .sort({ monthlyPrice: 1 })
            .lean();

        return handleResponse(res, 200, "Plans fetched successfully", plans);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Get Current Subscription
// ========================================
export const getCurrentSubscription = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const subscription = await Subscription.findOne({
            seller: sellerId,
            status: { $in: ["ACTIVE", "PENDING"] },
        })
            .populate({
                path: "plan",
                populate: { path: "features", select: "name code status" },
            })
            .populate("offer", "name discountType discountValue")
            .sort({ createdAt: -1 })
            .lean();

        if (!subscription) {
            return handleResponse(res, 200, "No active subscription", null);
        }

        return handleResponse(res, 200, "Current subscription fetched", subscription);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Get Active Offers for a Plan
// ========================================
export const getActiveOffers = async (req, res) => {
    try {
        const now = new Date();
        const query = {
            status: "ACTIVE",
            startDate: { $lte: now },
            endDate: { $gte: now },
        };

        if (req.query.plan) {
            query.plan = req.query.plan;
        }

        const offers = await SubscriptionOffer.find(query)
            .populate("plan", "name monthlyPrice yearlyPrice")
            .sort({ discountValue: -1 })
            .lean();

        return handleResponse(res, 200, "Active offers fetched", offers);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Get Subscription History
// ========================================
export const getSubscriptionHistory = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const subscriptions = await Subscription.find({ seller: sellerId })
            .populate("plan", "name")
            .populate("offer", "name discountType discountValue")
            .sort({ createdAt: -1 })
            .lean();

        return handleResponse(res, 200, "Subscription history fetched", subscriptions);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Create Razorpay Order (Initiate Payment)
// ========================================
export const createSubscriptionOrder = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { planId, billingCycle, offerId } = req.body;

        if (!planId || !billingCycle) {
            return handleResponse(res, 400, "Plan and billing cycle are required");
        }

        if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
            return handleResponse(res, 400, "Billing cycle must be MONTHLY or YEARLY");
        }

        // Fetch plan
        const plan = await SubscriptionPlan.findById(planId).populate("features").lean();
        if (!plan || plan.status !== "ACTIVE") {
            return handleResponse(res, 404, "Plan not found or inactive");
        }

        if (!plan.billingTypes.includes(billingCycle)) {
            return handleResponse(res, 400, `This plan does not support ${billingCycle} billing`);
        }

        // Calculate price
        const originalAmount = billingCycle === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
        let discountAmount = 0;
        let offerDoc = null;

        // Check for offer
        if (offerId) {
            const now = new Date();
            offerDoc = await SubscriptionOffer.findOne({
                _id: offerId,
                plan: planId,
                status: "ACTIVE",
                startDate: { $lte: now },
                endDate: { $gte: now },
            }).lean();

            if (offerDoc) {
                if (offerDoc.discountType === "PERCENTAGE") {
                    discountAmount = Math.round((originalAmount * offerDoc.discountValue) / 100);
                } else {
                    discountAmount = Math.min(offerDoc.discountValue, originalAmount);
                }
            }
        }

        const finalAmount = Math.max(originalAmount - discountAmount, 0);

        // If finalAmount is 0 (free plan or 100% discount), activate immediately
        if (finalAmount === 0) {
            const startDate = new Date();
            const endDate = new Date(startDate);
            if (billingCycle === "MONTHLY") {
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const subscription = new Subscription({
                seller: sellerId,
                plan: planId,
                planSnapshot: {
                    name: plan.name,
                    price: 0,
                    orderLimit: plan.orderLimit,
                    features: plan.features.map((f) => f.code),
                },
                billingCycle,
                startDate,
                endDate,
                orderLimit: plan.orderLimit,
                ordersUsed: 0,
                status: "ACTIVE",
                offer: offerDoc?._id || null,
                amount: originalAmount,
                discountAmount,
                finalAmount: 0,
            });
            await subscription.save();

            return handleResponse(res, 201, "Free subscription activated", {
                subscription,
                paymentRequired: false,
            });
        }

        // Create Razorpay Order
        const rzp = getRazorpay();
        const receiptId = `sub_${sellerId}_${Date.now()}`;

        const razorpayOrder = await rzp.orders.create({
            amount: finalAmount * 100, // Convert to paise
            currency: "INR",
            receipt: receiptId,
            notes: {
                sellerId,
                planId,
                billingCycle,
                offerId: offerId || "",
            },
        });

        // Create a PENDING payment record
        const payment = new SubscriptionPayment({
            seller: sellerId,
            plan: planId,
            billingCycle,
            originalAmount,
            discountAmount,
            finalAmount,
            paymentGateway: "RAZORPAY",
            orderId: razorpayOrder.id,
            status: "PENDING",
        });
        await payment.save();

        return handleResponse(res, 201, "Payment order created", {
            paymentRequired: true,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            amount: finalAmount,
            amountPaise: finalAmount * 100,
            currency: "INR",
            receipt: receiptId,
            paymentId: payment._id,
            plan: {
                name: plan.name,
                originalAmount,
                discountAmount,
                finalAmount,
                billingCycle,
                offer: offerDoc ? { name: offerDoc.name, discountType: offerDoc.discountType, discountValue: offerDoc.discountValue } : null,
            },
        });
    } catch (error) {
        logger.error("createSubscriptionOrder failed", {
            scope: "SellerSubscriptionController",
            message: error.message,
            sellerId: req.user?.id,
        });
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Verify Payment & Activate Subscription
// ========================================
export const verifySubscriptionPayment = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return handleResponse(res, 400, "Payment verification details are required");
        }

        // Verify signature
        const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
        const generatedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return handleResponse(res, 400, "Payment verification failed — invalid signature");
        }

        // Find the payment record
        const payment = await SubscriptionPayment.findOne({
            orderId: razorpay_order_id,
            seller: sellerId,
            status: "PENDING",
        });

        if (!payment) {
            return handleResponse(res, 404, "Payment record not found");
        }

        // Update payment as successful
        payment.paymentId = razorpay_payment_id;
        payment.status = "SUCCESS";
        payment.paidAt = new Date();
        await payment.save();

        // Fetch plan for snapshot
        const plan = await SubscriptionPlan.findById(payment.plan).populate("features").lean();
        if (!plan) {
            return handleResponse(res, 404, "Associated plan not found");
        }

        // Expire any existing active subscription for this seller
        await Subscription.updateMany(
            { seller: sellerId, status: "ACTIVE" },
            { $set: { status: "EXPIRED" } }
        );

        // Create the active subscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (payment.billingCycle === "MONTHLY") {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const subscription = new Subscription({
            seller: sellerId,
            plan: plan._id,
            planSnapshot: {
                name: plan.name,
                price: payment.finalAmount,
                orderLimit: plan.orderLimit,
                features: plan.features.map((f) => f.code),
            },
            billingCycle: payment.billingCycle,
            startDate,
            endDate,
            orderLimit: plan.orderLimit,
            ordersUsed: 0,
            status: "ACTIVE",
            offer: payment.offer || null,
            amount: payment.originalAmount,
            discountAmount: payment.discountAmount,
            finalAmount: payment.finalAmount,
        });
        await subscription.save();

        // Link subscription to payment
        payment.subscription = subscription._id;
        await payment.save();

        // Populate for response
        const populated = await Subscription.findById(subscription._id)
            .populate({ path: "plan", populate: { path: "features" } })
            .lean();

        return handleResponse(res, 200, "Payment verified & subscription activated", {
            subscription: populated,
        });
    } catch (error) {
        logger.error("verifySubscriptionPayment failed", {
            scope: "SellerSubscriptionController",
            message: error.message,
            sellerId: req.user?.id,
        });
        return handleResponse(res, 500, error.message);
    }
};

// ========================================
// Seller: Get Payment History
// ========================================
export const getPaymentHistory = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const payments = await SubscriptionPayment.find({ seller: sellerId })
            .populate("plan", "name")
            .populate("subscription", "status startDate endDate billingCycle")
            .sort({ createdAt: -1 })
            .lean();

        return handleResponse(res, 200, "Payment history fetched", payments);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
