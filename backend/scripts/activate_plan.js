import mongoose from "mongoose";
import dotenv from "dotenv";
import Seller from "../app/models/seller.js";
import SubscriptionPlan from "../app/models/subscriptionPlan.js";
import Subscription from "../app/models/subscription.js";
import PlanFeature from "../app/models/planFeature.js";

dotenv.config();

async function activatePlan() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/dm-groceries";
    await mongoose.connect(mongoUri);
    console.log(`Connected to DB`);

    const seller = await Seller.findOne({ email: "seller@appzeto.com" });
    if (!seller) {
      console.log("Seller not found");
      process.exit(1);
    }

    const plan = await SubscriptionPlan.findOne({ name: "Gold Plan" }).populate('features');
    if (!plan) {
      console.log("Gold Plan not found");
      process.exit(1);
    }

    // Cancel existing subscriptions if any
    await Subscription.updateMany(
      { seller: seller._id, status: "ACTIVE" },
      { $set: { status: "CANCELLED" } }
    );

    const planSnapshot = {
      name: plan.name,
      price: plan.monthlyPrice,
      orderLimit: plan.orderLimit,
      features: plan.features.map(f => f.code)
    };

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = new Subscription({
      seller: seller._id,
      plan: plan._id,
      planSnapshot,
      billingCycle: "MONTHLY",
      startDate: new Date(),
      endDate: nextMonth,
      orderLimit: plan.orderLimit,
      ordersUsed: 0,
      status: "ACTIVE",
      autoRenew: true,
      amount: plan.monthlyPrice,
      discountAmount: 0,
      finalAmount: plan.monthlyPrice
    });

    await subscription.save();
    console.log("Subscription created and activated for seller.");
    process.exit(0);
  } catch (error) {
    console.error("Error activating plan:", error);
    process.exit(1);
  }
}

activatePlan();
