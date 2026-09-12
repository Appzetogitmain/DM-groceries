import Joi from "joi";
import { ADMIN_SECTIONS, ALL_ACTIONS } from "../constants/permissions.js";

const sectionKeys = Object.keys(ADMIN_SECTIONS);

const passwordSchema = Joi.string()
  .min(10)
  .max(128)
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[0-9]/, "number")
  .required();

/**
 * Joi schema for the permissions map.
 * Each key must be a valid section, and each value must be an array of valid actions for that section.
 */
const permissionsSchema = Joi.object()
  .pattern(
    Joi.string().valid(...sectionKeys),
    Joi.array().items(Joi.string().valid(...ALL_ACTIONS)).min(1).unique(),
  )
  .min(1)
  .required()
  .messages({
    "object.min": "At least one permission section must be assigned",
  });

export const sendInviteOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

export const verifyEmailSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  otp: Joi.string().trim().length(6).pattern(/^\d+$/).required()
    .messages({ "string.pattern.base": "OTP must be exactly 6 digits" }),
});

export const createSubAdminSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  name: Joi.string().trim().min(2).max(80).required(),
  password: passwordSchema,
  permissions: permissionsSchema,
});

export const updateSubAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).optional(),
  permissions: permissionsSchema.optional(),
}).min(1).messages({
  "object.min": "At least one field (name or permissions) must be provided",
});

export const resetPasswordSchema = Joi.object({
  newPassword: passwordSchema,
});

export function validateSubAdminSchema(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (!error) return value;
  const err = new Error(error.details.map((item) => item.message).join("; "));
  err.statusCode = 400;
  throw err;
}
