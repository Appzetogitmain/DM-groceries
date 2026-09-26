import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true
    },
    // Historical snapshot of the plan to prevent changes if admin edits the plan
    planSnapshot: {
      name: String,
      price: Number,
      orderLimit: Number,
      features: [String] // Array of feature codes
    },
    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    orderLimit: {
      type: Number,
      default: null
    },
    ordersUsed: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED"
      ],
      default: "PENDING"
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionOffer",
      default: null
    },
    amount: {
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
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Subscription", subscriptionSchema);
