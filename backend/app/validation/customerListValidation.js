import Joi from "joi";

const trimmedString = Joi.string().trim();
const objectIdLike = trimmedString.min(8).max(64);

const listItemSchema = Joi.object({
  productId: objectIdLike.required(),
  variantSku: trimmedString.max(64).optional().allow(""),
  variantName: trimmedString.max(128).optional().allow(""),
  quantity: Joi.number().integer().min(1).max(99).default(1),
  unitPriceSnapshot: Joi.number().min(0).optional().default(0),
});

// Allowed "remind me after N days" choices (0 = no reminder)
export const LIST_REMINDER_DAY_OPTIONS = [0, 3, 5, 7, 10, 15, 30];
const reminderDaysSchema = Joi.number()
  .integer()
  .valid(...LIST_REMINDER_DAY_OPTIONS);

export const createCustomerListSchema = Joi.object({
  name: trimmedString.min(2).max(100).required(),
  sellerId: objectIdLike.optional().allow(null, ""),
  items: Joi.array().items(listItemSchema).min(1).required(),
  isPinned: Joi.boolean().optional().default(false),
  reminderDays: reminderDaysSchema.optional(),
});

export const updateCustomerListSchema = Joi.object({
  name: trimmedString.min(2).max(100).optional(),
  items: Joi.array().items(listItemSchema).min(1).optional(),
  isPinned: Joi.boolean().optional(),
  status: Joi.string().valid("active", "archived").optional(),
  reminderDays: reminderDaysSchema.optional(),
});

export const snoozeListReminderSchema = Joi.object({
  hours: Joi.number().integer().min(1).max(24 * 7).optional().default(24),
});
