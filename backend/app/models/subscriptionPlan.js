import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0
    },
    yearlyPrice: {
      type: Number,
      required: true,
      min: 0
    },
    orderLimit: {
      type: Number,
      default: null // null means unlimited
    },
    billingTypes: [
      {
        type: String,
        enum: ["MONTHLY", "YEARLY"]
      }
    ],
    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlanFeature"
      }
    ],
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
