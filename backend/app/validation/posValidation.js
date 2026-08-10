import Joi from "joi";

const posOrderItemSchema = Joi.object({
  product: Joi.string().optional(),
  productId: Joi.string().optional(),
  id: Joi.string().optional(),
  name: Joi.string().allow("", null),
  variantSku: Joi.string().allow("", null).optional(),
  variantSlot: Joi.string().allow("", null).optional(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().min(0).optional(),
  image: Joi.string().allow("", null),
}).or("product", "productId", "id");

export const posCustomerLookupSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^(\+91|91)?[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Please enter a valid Indian phone number",
    }),
});

export const posCreateOrderSchema = Joi.object({
  items: Joi.array().items(posOrderItemSchema).min(1).required(),
  customer: Joi.object({
    phone: Joi.string().required(),
    name: Joi.string().allow("", null).optional(),
    customerId: Joi.string().allow("", null).optional(),
  }).required(),
  paymentMode: Joi.string()
    .valid("CASH", "ONLINE", "MIXED")
    .default("CASH"),
  cashReceived: Joi.number().min(0).default(0),
  onlineAmountPaid: Joi.number().min(0).default(0),
  discount: Joi.number().min(0).default(0),
  discountType: Joi.string().valid("flat", "percentage").default("flat"),
  note: Joi.string().allow("", null).optional(),
});

export const posOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow("", null).optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  paymentMode: Joi.string().valid("CASH", "ONLINE", "MIXED").optional(),
});

export const posProductSearchSchema = Joi.object({
  search: Joi.string().allow("", null).optional(),
  category: Joi.string().allow("", null).optional(),
  subcategory: Joi.string().allow("", null).optional(),
  header: Joi.string().allow("", null).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  barcode: Joi.string().allow("", null).optional(),
});
