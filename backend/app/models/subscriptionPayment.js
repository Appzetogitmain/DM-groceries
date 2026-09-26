import mongoose from 'mongoose';

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription" // Can be null initially before successful payment creates subscription
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true
    },
    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      required: true
    },
    originalAmount: {
      type: Number,
      required: true
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    paymentGateway: {
      type: String,
      default: "RAZORPAY"
    },
    orderId: {
      type: String, // Razorpay Order ID
      required: true
    },
    paymentId: {
      type: String // Razorpay Payment ID
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING"
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);
