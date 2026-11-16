import mongoose from "mongoose";

const packageItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        originalPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        packagePricePerUnit: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        priceAtAddition: {
            type: Number,
            required: true,
            min: 0,
        },
        totalItemPrice: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const packageSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        coverImage: {
            type: String,
            default: "",
        },
        galleryImages: [
            {
                type: String,
            },
        ],
        items: {
            type: [packageItemSchema],
            required: true,
            validate: [
                (val) => Array.isArray(val) && val.length >= 1,
                "A package must contain at least 1 product",
            ],
        },
        originalTotalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        packagePrice: {
            type: Number,
            required: true,
            min: 0,
        },
        discountPercentage: {
            type: Number,
            default: 0,
            min: 0,
        },
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },
        approvalRequestedAt: {
            type: Date,
            default: Date.now,
        },
        approvalReviewedAt: {
            type: Date,
            default: null,
        },
        approvalReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
        approvalNote: {
            type: String,
            trim: true,
            default: "",
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },
        lastSubmittedByRole: {
            type: String,
            enum: ["seller", "admin"],
            default: "seller",
        },
    },
    { timestamps: true }
);

packageSchema.index({ sellerId: 1, approvalStatus: 1, createdAt: -1 });
packageSchema.index({ approvalStatus: 1, status: 1, createdAt: -1 });
packageSchema.index({ status: 1, createdAt: -1 });
packageSchema.index({ name: "text", description: "text" });

export default mongoose.model("Package", packageSchema);

