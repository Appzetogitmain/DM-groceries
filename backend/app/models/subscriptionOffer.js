import mongoose from 'mongoose';

const subscriptionOfferSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    offerType: {
      type: String,
      enum: ["PLAN_DISCOUNT"],
      default: "PLAN_DISCOUNT"
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "ACTIVE", "EXPIRED", "INACTIVE"],
      default: "SCHEDULED"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("SubscriptionOffer", subscriptionOfferSchema);
