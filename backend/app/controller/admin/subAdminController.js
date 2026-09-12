import handleResponse from "../../utils/helper.js";
import {
  sendInviteOtpSchema,
  verifyEmailSchema,
  createSubAdminSchema,
  updateSubAdminSchema,
  resetPasswordSchema,
  validateSubAdminSchema,
} from "../../validation/subAdminValidation.js";
import {
  sendInviteOtp,
  verifyInviteOtp,
  createSubAdmin as createSubAdminService,
  listSubAdmins as listSubAdminsService,
  getSubAdminById as getSubAdminByIdService,
  updateSubAdmin as updateSubAdminService,
  toggleSubAdminStatus as toggleSubAdminStatusService,
  deleteSubAdmin as deleteSubAdminService,
  resetSubAdminPassword as resetSubAdminPasswordService,
} from "../../services/admin/subAdminService.js";
import { ADMIN_SECTIONS } from "../../constants/permissions.js";

/**
 * POST /admin/sub-admins/send-invite-otp
 * Send OTP to a new Sub Admin's email for verification.
 */
export const sendSubAdminInviteOtp = async (req, res) => {
  try {
    const payload = validateSubAdminSchema(sendInviteOtpSchema, req.body || {});
    const result = await sendInviteOtp(payload.email, req.user.id);
    return handleResponse(res, 200, "Verification OTP sent to email", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * POST /admin/sub-admins/verify-email
 * Verify the email OTP.
 */
export const verifySubAdminEmail = async (req, res) => {
  try {
    const payload = validateSubAdminSchema(verifyEmailSchema, req.body || {});
    const result = await verifyInviteOtp(payload.email, payload.otp);
    return handleResponse(res, 200, "Email verified successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * POST /admin/sub-admins/create
 * Create a new Sub Admin after email verification.
 */
export const createSubAdmin = async (req, res) => {
  try {
    const payload = validateSubAdminSchema(createSubAdminSchema, req.body || {});
    const result = await createSubAdminService({
      ...payload,
      superAdminId: req.user.id,
    });
    return handleResponse(res, 201, "Sub Admin created successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * GET /admin/sub-admins
 * List all Sub Admins.
 */
export const getSubAdmins = async (req, res) => {
  try {
    const results = await listSubAdminsService();
    return handleResponse(res, 200, "Sub Admins retrieved", results);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * GET /admin/sub-admins/:id
 * Get a single Sub Admin by ID.
 */
export const getSubAdminById = async (req, res) => {
  try {
    const result = await getSubAdminByIdService(req.params.id);
    return handleResponse(res, 200, "Sub Admin retrieved", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * PUT /admin/sub-admins/:id
 * Update a Sub Admin's name and/or permissions.
 */
export const updateSubAdmin = async (req, res) => {
  try {
    const payload = validateSubAdminSchema(updateSubAdminSchema, req.body || {});
    const result = await updateSubAdminService(req.params.id, payload);
    return handleResponse(res, 200, "Sub Admin updated successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * PATCH /admin/sub-admins/:id/toggle-status
 * Activate or deactivate a Sub Admin.
 */
export const toggleSubAdminStatus = async (req, res) => {
  try {
    const result = await toggleSubAdminStatusService(req.params.id);
    const status = result.isActive ? "activated" : "deactivated";
    return handleResponse(res, 200, `Sub Admin ${status} successfully`, result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * DELETE /admin/sub-admins/:id
 * Delete a Sub Admin account.
 */
export const deleteSubAdmin = async (req, res) => {
  try {
    const result = await deleteSubAdminService(req.params.id);
    return handleResponse(res, 200, "Sub Admin deleted successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * POST /admin/sub-admins/:id/reset-password
 * Super Admin resets a Sub Admin's password.
 */
export const resetSubAdminPassword = async (req, res) => {
  try {
    const payload = validateSubAdminSchema(resetPasswordSchema, req.body || {});
    const result = await resetSubAdminPasswordService(req.params.id, payload.newPassword);
    return handleResponse(res, 200, "Password reset successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/**
 * GET /admin/sub-admins/permissions-map
 * Return the available permission sections and their actions (for the frontend UI).
 */
export const getPermissionsMap = async (req, res) => {
  try {
    return handleResponse(res, 200, "Permission sections retrieved", {
      sections: ADMIN_SECTIONS,
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
