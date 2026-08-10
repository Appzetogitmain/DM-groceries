import handleResponse from "../utils/helper.js";
import { validateBody, validate } from "../middleware/validate.js";
import {
  posCustomerLookupSchema,
  posCreateOrderSchema,
  posOrderQuerySchema,
  posProductSearchSchema,
} from "../validation/posValidation.js";
import * as posService from "../services/posService.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import mongoose from "mongoose";

export const lookupCustomer = async (req, res) => {
  try {
    const { phone } = validateBody(posCustomerLookupSchema, req.body);
    const customer = await posService.lookupOrCreateCustomer({ phone });

    return handleResponse(res, 200, "Customer lookup successful", {
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
    });
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const createPosOrder = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const payload = validateBody(posCreateOrderSchema, req.body);

    const order = await posService.createPosOrder({
      sellerId,
      items: payload.items,
      customerInput: payload.customer,
      paymentMode: payload.paymentMode,
      cashReceived: payload.cashReceived,
      onlineAmountPaid: payload.onlineAmountPaid,
      discount: payload.discount,
      discountType: payload.discountType,
      note: payload.note,
    });

    return handleResponse(res, 201, "POS Order created successfully", order);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const getPosOrdersList = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const query = validateBody(posOrderQuerySchema, req.query);

    const data = await posService.getPosOrders(sellerId, query);
    return handleResponse(res, 200, "POS Orders fetched", data);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const getPosOrderDetail = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      seller: sellerId,
      orderType: "POS",
    }).populate("customer", "name phone email");

    if (!order) {
      return handleResponse(res, 404, "POS Order not found");
    }

    return handleResponse(res, 200, "POS Order details", order);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const searchPosProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { search, category, subcategory, header, page, limit, barcode } = validateBody(posProductSearchSchema, req.query);

    const query = { sellerId, status: "active", approvalStatus: "approved" };

    if (barcode) {
      query.sku = barcode;
    } else if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    if (category) query.categoryId = category;
    if (subcategory) query.subcategoryId = subcategory;
    if (header) query.headerId = header;

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name price salePrice stock mainImage sku variants")
      .lean();

    return handleResponse(res, 200, "Products fetched for POS", products);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

export const getPosStats = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const stats = await posService.getPosStats(sellerId);
    return handleResponse(res, 200, "POS Stats fetched", stats);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};
