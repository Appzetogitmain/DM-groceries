import mongoose from "mongoose";

const sosAlertSchema = new mongoose.Schema(
    {
        deliveryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        emergencyContacts: [
            {
                name: { type: String },
                phone: { type: String }
            }
        ],
        status: {
            type: String,
            enum: ["active", "resolved", "false_alarm"],
            default: "active",
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
        resolvedAt: {
            type: Date,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

sosAlertSchema.index({ status: 1 });
sosAlertSchema.index({ location: "2dsphere" });

export default mongoose.model("SosAlert", sosAlertSchema);
