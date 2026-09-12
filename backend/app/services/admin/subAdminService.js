import crypto from "crypto";
import Admin from "../../models/admin.js";
import SubAdminInvite from "../../models/subAdminInvite.js";
import { sendSubAdminInviteOtpEmail } from "../emailService.js";
import { validatePermissions, isSuperAdmin } from "../../constants/permissions.js";
import logger from "../logger.js";
import bcrypt from "bcrypt";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  // Generate a cryptographically secure numeric OTP
  const max = Math.pow(10, OTP_LENGTH);
  const min = Math.pow(10, OTP_LENGTH - 1);
  const num = crypto.randomInt(min, max);
  return String(num);
}

function hashOtp(email, otp) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "unsafe-dev-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`sub_admin_invite:${email}:${otp}`)
    .digest("hex");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isMockEmailMode() {
  return (
    process.env.USE_REAL_EMAIL_OTP !== "true" &&
    process.env.USE_REAL_EMAIL_OTP !== "1"
  );
}

/**
 * Send OTP to a prospective Sub Admin's email for verification.
 */
export async function sendInviteOtp(email, superAdminId) {
  // Verify the requesting admin is a super admin
  const superAdmin = await Admin.findById(superAdminId).lean();
  if (!superAdmin || !isSuperAdmin(superAdmin)) {
    const err = new Error("Only Super Admins can create Sub Admins");
    err.statusCode = 403;
    throw err;
  }

  // Check if email is already registered as an admin
  const existingAdmin = await Admin.findOne({ email }).lean();
  if (existingAdmin) {
    const err = new Error("An admin account with this email already exists");
    err.statusCode = 409;
    throw err;
  }

  // Generate OTP and store invite
  const otp = generateOtp();
  const otpHash = hashOtp(email, otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Upsert: replace any existing invite for this email
  await SubAdminInvite.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      isVerified: false,
      createdBy: superAdminId,
    },
    { upsert: true, new: true },
  );

  // Send the OTP email
  const emailResult = await sendSubAdminInviteOtpEmail({
    email,
    otp,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });

  logger.info("Sub Admin invite OTP sent", {
    module: "sub-admin",
    email,
    superAdminId,
    mode: emailResult.mode,
  });

  const response = {
    sent: true,
    email,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
  };

  // In mock mode, include the OTP for testing
  if (isMockEmailMode()) {
    response.mockOtp = otp;
  }

  return response;
}

/**
 * Verify the email OTP for Sub Admin creation.
 */
export async function verifyInviteOtp(email, otp) {
  const invite = await SubAdminInvite.findOne({ email }).select("+otpHash");

  if (!invite) {
    const err = new Error("No pending invitation found for this email. Please request a new OTP.");
    err.statusCode = 400;
    throw err;
  }

  // Check expiry
  if (!invite.expiresAt || invite.expiresAt <= new Date()) {
    await SubAdminInvite.deleteOne({ _id: invite._id });
    const err = new Error("OTP has expired. Please request a new one.");
    err.statusCode = 400;
    throw err;
  }

  // Check max attempts
  if ((invite.attempts || 0) >= (invite.maxAttempts || 5)) {
    await SubAdminInvite.deleteOne({ _id: invite._id });
    const err = new Error("Maximum verification attempts exceeded. Please request a new OTP.");
    err.statusCode = 429;
    throw err;
  }

  // Compare OTP
  const incomingHash = hashOtp(email, String(otp).trim());
  if (!safeCompare(invite.otpHash, incomingHash)) {
    invite.attempts = (invite.attempts || 0) + 1;
    await invite.save();

    const remaining = (invite.maxAttempts || 5) - invite.attempts;
    const err = new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    err.statusCode = 400;
    err.attemptsRemaining = remaining;
    throw err;
  }

  // Mark as verified
  invite.isVerified = true;
  await invite.save();

  logger.info("Sub Admin email verified", { module: "sub-admin", email });

  return { verified: true, email };
}

/**
 * Create a new Sub Admin after email verification.
 */
export async function createSubAdmin({ email, name, password, permissions, superAdminId }) {
  // Verify the invite was completed
  const invite = await SubAdminInvite.findOne({ email, isVerified: true });
  if (!invite) {
    const err = new Error("Email must be verified before creating a Sub Admin account");
    err.statusCode = 400;
    throw err;
  }

  // Double-check the super admin
  const superAdmin = await Admin.findById(superAdminId).lean();
  if (!superAdmin || !isSuperAdmin(superAdmin)) {
    const err = new Error("Only Super Admins can create Sub Admins");
    err.statusCode = 403;
    throw err;
  }

  // Validate permissions
  const { valid, errors } = validatePermissions(permissions);
  if (!valid) {
    const err = new Error(`Invalid permissions: ${errors.join("; ")}`);
    err.statusCode = 400;
    throw err;
  }

  // Check duplicate
  const existing = await Admin.findOne({ email }).lean();
  if (existing) {
    const err = new Error("An admin account with this email already exists");
    err.statusCode = 409;
    throw err;
  }

  // Create the sub admin
  const subAdmin = await Admin.create({
    name,
    email,
    password,
    role: "admin",
    adminType: "sub_admin",
    isVerified: true,
    isActive: true,
    permissions: new Map(Object.entries(permissions)),
    createdBy: superAdminId,
    emailVerifiedAt: new Date(),
  });

  // Clean up the invite
  await SubAdminInvite.deleteOne({ _id: invite._id });

  logger.info("Sub Admin created", {
    module: "sub-admin",
    subAdminId: subAdmin._id,
    email,
    superAdminId,
  });

  return sanitizeSubAdmin(subAdmin);
}

/**
 * List all Sub Admins.
 */
export async function listSubAdmins() {
  const subAdmins = await Admin.find({ adminType: "sub_admin" })
    .select("-password -__v")
    .sort({ createdAt: -1 })
    .lean();

  return subAdmins.map((admin) => ({
    ...admin,
    permissions: admin.permissions instanceof Map
      ? Object.fromEntries(admin.permissions)
      : admin.permissions || {},
  }));
}

/**
 * Get a single Sub Admin by ID.
 */
export async function getSubAdminById(id) {
  const subAdmin = await Admin.findOne({ _id: id, adminType: "sub_admin" })
    .select("-password -__v")
    .lean();

  if (!subAdmin) {
    const err = new Error("Sub Admin not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    ...subAdmin,
    permissions: subAdmin.permissions instanceof Map
      ? Object.fromEntries(subAdmin.permissions)
      : subAdmin.permissions || {},
  };
}

/**
 * Update a Sub Admin's name and/or permissions.
 */
export async function updateSubAdmin(id, updates) {
  const subAdmin = await Admin.findOne({ _id: id, adminType: "sub_admin" });
  if (!subAdmin) {
    const err = new Error("Sub Admin not found");
    err.statusCode = 404;
    throw err;
  }

  if (updates.name) {
    subAdmin.name = updates.name;
  }

  if (updates.permissions) {
    const { valid, errors } = validatePermissions(updates.permissions);
    if (!valid) {
      const err = new Error(`Invalid permissions: ${errors.join("; ")}`);
      err.statusCode = 400;
      throw err;
    }
    subAdmin.permissions = new Map(Object.entries(updates.permissions));
  }

  await subAdmin.save();

  logger.info("Sub Admin updated", {
    module: "sub-admin",
    subAdminId: id,
    updatedFields: Object.keys(updates),
  });

  return sanitizeSubAdmin(subAdmin);
}

/**
 * Toggle a Sub Admin's active/inactive status.
 */
export async function toggleSubAdminStatus(id) {
  const subAdmin = await Admin.findOne({ _id: id, adminType: "sub_admin" });
  if (!subAdmin) {
    const err = new Error("Sub Admin not found");
    err.statusCode = 404;
    throw err;
  }

  subAdmin.isActive = !subAdmin.isActive;
  await subAdmin.save();

  logger.info("Sub Admin status toggled", {
    module: "sub-admin",
    subAdminId: id,
    isActive: subAdmin.isActive,
  });

  return sanitizeSubAdmin(subAdmin);
}

/**
 * Delete a Sub Admin account permanently.
 */
export async function deleteSubAdmin(id) {
  const subAdmin = await Admin.findOneAndDelete({ _id: id, adminType: "sub_admin" });
  if (!subAdmin) {
    const err = new Error("Sub Admin not found");
    err.statusCode = 404;
    throw err;
  }

  logger.info("Sub Admin deleted", {
    module: "sub-admin",
    subAdminId: id,
    email: subAdmin.email,
  });

  return { deleted: true, id };
}

/**
 * Reset a Sub Admin's password (by Super Admin).
 */
export async function resetSubAdminPassword(id, newPassword) {
  const subAdmin = await Admin.findOne({ _id: id, adminType: "sub_admin" }).select("+password");
  if (!subAdmin) {
    const err = new Error("Sub Admin not found");
    err.statusCode = 404;
    throw err;
  }

  subAdmin.password = newPassword; // pre-save hook will hash it
  await subAdmin.save();

  logger.info("Sub Admin password reset", {
    module: "sub-admin",
    subAdminId: id,
  });

  return { reset: true, id };
}

/**
 * Remove sensitive fields from a sub admin document.
 */
function sanitizeSubAdmin(adminDoc) {
  const admin = adminDoc?.toObject ? adminDoc.toObject() : { ...(adminDoc || {}) };
  delete admin.password;
  delete admin.__v;

  // Convert Map to plain object for JSON serialization
  if (admin.permissions instanceof Map) {
    admin.permissions = Object.fromEntries(admin.permissions);
  }

  return admin;
}
