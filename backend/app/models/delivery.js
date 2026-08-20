import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
        },

        vehicleType: {
            type: String,
            enum: ["bike", "cycle", "scooter"],
            default: "bike",
        },

        email: {
            type: String,
            trim: true,
        },

        dob: {
            type: String,
            trim: true,
        },

        bloodGroup: {
            type: String,
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        accountHolder: {
            type: String,
            trim: true,
        },

        accountNumber: {
            type: String,
            trim: true,
        },

        ifsc: {
            type: String,
            trim: true,
        },

        documents: {
            aadhar: { type: String },
            pan: { type: String },
            drivingLicense: { type: String },
            policeClearance: { type: String },
            bankPassbook: { type: String },
        },

        emergencyContacts: [
            {
                name: { type: String, required: true },
                phone: { type: String, required: true }
            }
        ],

        shareLiveLocation: {
            type: Boolean,
            default: true
        },

        profileVisibility: {
            type: Boolean,
            default: true
        },

        vehicleNumber: {
            type: String,
            trim: true,
        },

        drivingLicenseNumber: {
            type: String,
            trim: true,
        },

        currentArea: {
            type: String,
            trim: true,
        },
        profileImage: {
            type: String,
            trim: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },



        isOnline: {
            type: Boolean,
            default: true,
        },
        
        isDeleted: {
            type: Boolean,
            default: false,
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
        role: {
            type: String,
            default: "delivery",
        },

        otp: {
            type: String,
            select: false,
        },

        otpExpiry: {
            type: Date,
            select: false,
        },

        lastLogin: Date,

        /** Last GPS fix from POST /delivery/location (for radius matching). */
        lastLocationAt: {
            type: Date,
        },

        averageRating: {
            type: Number,
            default: 0,
        },

        totalReviews: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

deliverySchema.index({ location: "2dsphere" });
deliverySchema.index({ isOnline: 1, isVerified: 1 });

deliverySchema.virtual('id').get(function () {
    return this._id.toHexString();
});

export default mongoose.model("Delivery", deliverySchema);
