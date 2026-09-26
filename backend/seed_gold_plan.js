import mongoose from "mongoose";
import dotenv from "dotenv";
import PlanFeature from "./app/models/planFeature.js";
import SubscriptionPlan from "./app/models/subscriptionPlan.js";

dotenv.config();

const featuresData = [
  // Originally seeded 14
  { name: "Product Listing", code: "PRODUCT_LISTING", description: "Product create/list" },
  { name: "Product Images", code: "PRODUCT_IMAGES", description: "Product images add/manage" },
  { name: "Product Variants", code: "PRODUCT_VARIANTS", description: "Variants add karna" },
  { name: "Inventory Management", code: "INVENTORY_MANAGEMENT", description: "Stock manage karna" },
  { name: "Order Management", code: "ORDER_MANAGEMENT", description: "Orders view/manage" },
  { name: "Order Notifications", code: "ORDER_NOTIFICATIONS", description: "New order alerts" },
  { name: "Order Status Management", code: "ORDER_STATUS_MANAGEMENT", description: "Order status update" },
  { name: "Low Stock Alerts", code: "LOW_STOCK_ALERTS", description: "Low-stock notification" },
  { name: "Featured Products", code: "FEATURED_PRODUCTS", description: "Product ko featured banana" },
  { name: "Promotional Visibility", code: "PROMOTIONAL_VISIBILITY", description: "Extra promotion/visibility" },
  { name: "Priority Support", code: "PRIORITY_SUPPORT", description: "Priority support" },
  { name: "Analytics / Reports", code: "ANALYTICS_REPORTS", description: "Seller analytics/reports" },
  { name: "Bulk Product Upload", code: "BULK_PRODUCT_UPLOAD", description: "Bulk products upload" },
  { name: "Discount / Coupon", code: "DISCOUNT_COUPON", description: "Seller discounts/coupons create" },
  // Newly added 6 high-value features
  { name: "Return Management", code: "RETURN_MANAGEMENT", description: "Manage customer return requests" },
  { name: "Money Withdrawal", code: "MONEY_WITHDRAWAL", description: "Manually request wallet payout to bank" },
  { name: "POS Billing", code: "POS_BILLING", description: "Access to in-store POS billing interface" },
  { name: "Custom Delivery Radius", code: "CUSTOM_DELIVERY_RADIUS", description: "Expand store delivery radius up to 15km" },
  { name: "Staff Management", code: "STAFF_MANAGEMENT", description: "Create staff/cashier sub-accounts" },
  { name: "Customer Chat", code: "CUSTOMER_CHAT", description: "Direct chat with customers" }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/dm-groceries";
    await mongoose.connect(mongoUri);
    console.log(`Connected to DB at ${mongoUri}`);

    const featureIds = [];

    for (const f of featuresData) {
      const existing = await PlanFeature.findOne({ code: f.code });
      if (existing) {
        existing.name = f.name;
        existing.description = f.description;
        existing.status = "ACTIVE";
        await existing.save();
        featureIds.push(existing._id);
        console.log(`Updated feature: ${f.code}`);
      } else {
        const nf = new PlanFeature(f);
        await nf.save();
        featureIds.push(nf._id);
        console.log(`Created feature: ${f.code}`);
      }
    }

    const planData = {
      name: "Gold Plan",
      description: "All-in-one premium plan for top sellers",
      monthlyPrice: 9999,
      yearlyPrice: 99990,
      orderLimit: null,
      billingTypes: ["MONTHLY", "YEARLY"],
      features: featureIds,
      status: "ACTIVE",
      isPopular: true
    };

    const existingPlan = await SubscriptionPlan.findOne({ name: "Gold Plan" });
    if (existingPlan) {
      existingPlan.monthlyPrice = planData.monthlyPrice;
      existingPlan.yearlyPrice = planData.yearlyPrice;
      existingPlan.features = planData.features;
      existingPlan.billingTypes = planData.billingTypes;
      existingPlan.isPopular = true;
      existingPlan.status = "ACTIVE";
      await existingPlan.save();
      console.log("Updated Gold Plan with all 20 features");
    } else {
      const np = new SubscriptionPlan(planData);
      await np.save();
      console.log("Created Gold Plan with all 20 features");
    }

    console.log("Seeding complete! You can safely delete this script.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seed();
