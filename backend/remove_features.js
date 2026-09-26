import mongoose from "mongoose";
import dotenv from "dotenv";
import PlanFeature from "./app/models/planFeature.js";
import SubscriptionPlan from "./app/models/subscriptionPlan.js";

dotenv.config();

const featuresToRemove = [
  "BULK_PRODUCT_UPLOAD",
  "DISCOUNT_COUPON",
  "PROMOTIONAL_VISIBILITY",
  "FEATURED_PRODUCTS",
  "PRIORITY_SUPPORT",
  "STAFF_MANAGEMENT",
  "CUSTOMER_CHAT"
];

async function removeFeatures() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/dm-groceries";
    await mongoose.connect(mongoUri);
    console.log(`Connected to DB at ${mongoUri}`);

    // 1. Find the IDs of the features to remove
    const features = await PlanFeature.find({ code: { $in: featuresToRemove } });
    const featureIdsToRemove = features.map(f => f._id.toString());
    
    if (featureIdsToRemove.length === 0) {
      console.log("No features found to remove. They might have already been deleted.");
    } else {
      console.log(`Found ${featureIdsToRemove.length} features to remove.`);
      
      // 2. Delete the features from the PlanFeature collection
      await PlanFeature.deleteMany({ _id: { $in: featureIdsToRemove } });
      console.log("Deleted features from database.");

      // 3. Remove these feature IDs from all Subscription Plans
      const plans = await SubscriptionPlan.find({});
      for (let plan of plans) {
        const originalLength = plan.features.length;
        plan.features = plan.features.filter(fId => !featureIdsToRemove.includes(fId.toString()));
        
        if (plan.features.length !== originalLength) {
          await plan.save();
          console.log(`Updated plan "${plan.name}": Removed ${originalLength - plan.features.length} features.`);
        }
      }
    }

    console.log("Feature cleanup complete! You can safely delete this script.");
    process.exit(0);
  } catch (error) {
    console.error("Error removing features:", error);
    process.exit(1);
  }
}

removeFeatures();
