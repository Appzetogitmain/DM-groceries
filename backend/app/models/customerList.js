import mongoose from "mongoose";

const customerListItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantSku: {
    type: String,
    default: "",
    trim: true,
  },
  variantName: {
    type: String,
    default: "",
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  unitPriceSnapshot: {
    type: Number,
    default: 0,
    min: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const customerListSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "My Grocery Basket",
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    items: [customerListItemSchema],
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    lastOrderedAt: {
      type: Date,
      default: null,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdFromOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    // Restock reminder: customer picks "remind me after N days" before
    // ordering the basket. 0 = reminders off. `nextReminderAt` is armed when
    // a list order is placed and cleared once the reminder is sent.
    reminderDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },
    nextReminderAt: {
      type: Date,
      default: null,
    },
    lastRemindedAt: {
      type: Date,
      default: null,
    },
    reminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

customerListSchema.index({ customerId: 1, status: 1, updatedAt: -1 });
customerListSchema.index({ nextReminderAt: 1, status: 1 });

export default mongoose.model("CustomerList", customerListSchema);
