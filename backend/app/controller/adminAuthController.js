import Admin from "../models/admin.js";
import jwt from "jsonwebtoken";
import handleResponse from "../utils/helper.js";
import {
  bootstrapAdminSchema,
  loginAdminSchema,
  validateSchema,
} from "../validation/adminAuthValidation.js";
import {
  issueAdminResetOtp,
  verifyAdminResetOtpCode,
  verifyAdminVerificationToken,
} from "../services/adminVerificationService.js";

const PUBLIC_ADMIN_SIGNUP_ENABLED = () =>
  process.env.ENABLE_PUBLIC_ADMIN_SIGNUP === "true";

function sanitizeAdmin(adminDoc) {
  const admin = adminDoc?.toObject ? adminDoc.toObject() : { ...(adminDoc || {}) };
  delete admin.password;
  delete admin.__v;
  // Convert Map to plain object for JSON serialization
  if (admin.permissions instanceof Map) {
    admin.permissions = Object.fromEntries(admin.permissions);
  }
  return admin;
}

const generateToken = (admin) =>
  jwt.sign(
    { id: admin._id, role: "admin", adminType: admin.adminType || "super_admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "7d" },
  );

function readBootstrapSecret(req) {
  return String(
    req.headers["x-admin-bootstrap-secret"] ||
      req.body?.adminSecret ||
      "",
  ).trim();
}

export const bootstrapAdmin = async (req, res) => {
  try {
    const configuredSecret = String(process.env.ADMIN_BOOTSTRAP_SECRET || "").trim();
    if (!configuredSecret) {
      return handleResponse(res, 503, "Admin bootstrap is not configured");
    }

    const suppliedSecret = readBootstrapSecret(req);
    if (!suppliedSecret || suppliedSecret !== configuredSecret) {
      return handleResponse(res, 403, "Invalid admin bootstrap secret");
    }

    const existingCount = await Admin.countDocuments({});
    if (existingCount > 0) {
      return handleResponse(res, 409, "Admin bootstrap is disabled after initial setup");
    }

    const payload = validateSchema(bootstrapAdminSchema, req.body || {});
    const duplicate = await Admin.findOne({ email: payload.email }).lean();
    if (duplicate) {
      return handleResponse(res, 409, "Admin already exists");
    }

    const admin = await Admin.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: "admin",
      isVerified: true,
    });

    const token = generateToken(admin);
    return handleResponse(res, 201, "Admin bootstrapped successfully", {
      token,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const signupAdmin = async (req, res) => {
  try {
    if (!PUBLIC_ADMIN_SIGNUP_ENABLED()) {
      return handleResponse(
        res,
        403,
        "Public admin signup is disabled. Use secure bootstrap flow.",
      );
    }

    const existingCount = await Admin.countDocuments({});
    if (existingCount > 0) {
      return handleResponse(res, 403, "Public admin signup is disabled after bootstrap");
    }

    const payload = validateSchema(bootstrapAdminSchema, req.body || {});
    const admin = await Admin.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: "admin",
      isVerified: true,
    });

    const token = generateToken(admin);
    return handleResponse(res, 201, "Admin registered successfully", {
      token,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const payload = validateSchema(loginAdminSchema, req.body || {});

    const admin = await Admin.findOne({ email: payload.email }).select("+password");
    if (!admin) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    // Check if the account is deactivated (sub admins can be deactivated)
    if (admin.isActive === false) {
      return handleResponse(res, 403, "Your account has been deactivated. Contact the Super Admin.");
    }

    const isMatch = await admin.comparePassword(payload.password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin);
    return handleResponse(res, 200, "Login successful", {
      token,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const sendAdminResetOtp = async (req, res) => {
  try {
    const { channel, rawValue } = req.body;
    if (!channel || !rawValue) return handleResponse(res, 400, "Channel and target value required");
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await issueAdminResetOtp({ channel, rawValue, ipAddress });
    return handleResponse(res, 200, "Reset OTP sent successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const verifyAdminResetOtp = async (req, res) => {
  try {
    const { channel, rawValue, otp } = req.body;
    if (!channel || !rawValue || !otp) return handleResponse(res, 400, "Channel, target, and OTP required");
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await verifyAdminResetOtpCode({ channel, rawValue, otp, ipAddress });
    return handleResponse(res, 200, "OTP verified successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const { channel, rawValue, token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return handleResponse(res, 400, "Password must be at least 8 characters");

    verifyAdminVerificationToken({ channel, rawValue, token, purpose: "admin_reset" });

    const admin = await Admin.findOne({ email: rawValue.toLowerCase() });
    if (!admin) return handleResponse(res, 404, "Admin not found");

    admin.password = newPassword;
    await admin.save();

    return handleResponse(res, 200, "Password reset successfully");
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
