import mongoose from "mongoose";

const subAdminInviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

// TTL index: auto-delete expired invite records after 15 minutes past expiresAt
subAdminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure only one active invite per email (handled by unique: true on the field)

export default mongoose.model("SubAdminInvite", subAdminInviteSchema);
