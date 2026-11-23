import CustomerList from "../models/customerList.js";
import Product from "../models/product.js";
import Seller from "../models/seller.js";
import Cart from "../models/cart.js";
import {
  computeNextReminderAt,
  snoozeListReminder,
} from "../services/customerListReminderService.js";

/**
 * Helper to ensure user ID
 */
const getCustomerId = (req) => {
  return req.user?.id || req.user?._id || req.userId;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Find an existing active list of this customer with the same name
 * (case-insensitive). Same products across different lists are allowed.
 */
const findDuplicateList = async ({ customerId, name, excludeId }) => {
  if (!name || !name.trim()) return null;
  const filter = {
    customerId,
    status: "active",
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return CustomerList.findOne(filter).select("_id name").lean();
};

const duplicateResponse = (res, dup) =>
  res.status(409).json({
    success: false,
    code: "DUPLICATE_LIST",
    existingListId: dup._id,
    message: `You already have a list named "${dup.name}". Please choose a different name.`,
  });

/**
 * POST /api/customer/lists
 * Create a new custom grocery basket / list
 */
export const createList = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, items, isPinned, reminderDays } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required to create a list",
      });
    }

    const productIds = items.map((it) => it.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("_id name nameHi nameGu sellerId price salePrice status approvalStatus variants mainImage stock")
      .lean();

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products in the list are invalid or no longer exist",
      });
    }

    // Verify Single-Seller Constraint
    const sellerIds = Array.from(
      new Set(products.map((p) => String(p.sellerId || "")))
    );

    if (sellerIds.length > 1) {
      return res.status(400).json({
        success: false,
        code: "MULTIPLE_SELLERS_CONFLICT",
        message:
          "All items in a list must belong to the same local store/seller. Please select items from one seller.",
      });
    }

    const resolvedSellerId = sellerIds[0];
    if (!resolvedSellerId) {
      return res.status(400).json({
        success: false,
        message: "Unable to determine seller for the selected items",
      });
    }

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const normalizedItems = items.map((it) => {
      const prod = productMap.get(String(it.productId));
      const currentPrice = Number(prod?.salePrice || prod?.price || 0);
      return {
        productId: prod._id,
        variantSku: it.variantSku || "",
        variantName: it.variantName || "",
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPriceSnapshot: currentPrice,
        addedAt: new Date(),
      };
    });

    const finalName = (name || "My Grocery Basket").trim();
    const dup = await findDuplicateList({ customerId, name: finalName });
    if (dup) return duplicateResponse(res, dup);

    const newList = await CustomerList.create({
      customerId,
      name: finalName,
      sellerId: resolvedSellerId,
      items: normalizedItems,
      isPinned: Boolean(isPinned),
      status: "active",
      reminderDays: Number(reminderDays) || 0,
    });

    const populated = await CustomerList.findById(newList._id)
      .populate({
        path: "items.productId",
        select: "name nameHi nameGu price salePrice images mainImage stock status approvalStatus unit weight",
      })
      .populate("sellerId", "shopName name storeName address city")
      .lean();

    return res.status(201).json({
      success: true,
      message: "List created successfully",
      result: populated,
    });
  } catch (error) {
    console.error("Create customer list error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create customer list",
    });
  }
};

/**
 * GET /api/customer/lists
 * Fetch all custom lists for the authenticated customer
 */
export const getLists = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { status = "active" } = req.query;
    const filter = { customerId };
    if (status !== "all") {
      filter.status = status;
    }

    const lists = await CustomerList.find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .populate({
        path: "items.productId",
        select: "name nameHi nameGu price salePrice images mainImage stock status approvalStatus unit weight sellerId",
      })
      .populate("sellerId", "shopName name storeName address city")
      .lean();

    // Enhance each list with computed summaries
    const enhanced = lists.map((list) => {
      let totalAmount = 0;
      let inStockCount = 0;
      let totalItemsCount = 0;

      const items = (list.items || []).map((it) => {
        const prod = it.productId;
        const livePrice = prod ? Number(prod.salePrice || prod.price || 0) : it.unitPriceSnapshot;
        const isAvailable = prod && prod.status === "active" && Number(prod.stock || 0) >= it.quantity;
        const subtotal = livePrice * (it.quantity || 1);

        totalAmount += subtotal;
        totalItemsCount += (it.quantity || 1);
        if (isAvailable) inStockCount += 1;

        return {
          ...it,
          livePrice,
          isAvailable,
          subtotal,
        };
      });

      return {
        ...list,
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalItemsCount,
        inStockCount,
        allItemsAvailable: inStockCount === items.length && items.length > 0,
      };
    });

    return res.status(200).json({
      success: true,
      result: enhanced,
    });
  } catch (error) {
    console.error("Get customer lists error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch customer lists",
    });
  }
};

/**
 * GET /api/customer/lists/:id
 * Get single list by ID
 */
export const getListById = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;

    const list = await CustomerList.findOne({ _id: id, customerId })
      .populate({
        path: "items.productId",
        select: "name nameHi nameGu price salePrice images mainImage stock status approvalStatus unit weight sellerId",
      })
      .populate("sellerId", "shopName name storeName address city")
      .lean();

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Customer list not found",
      });
    }

    return res.status(200).json({
      success: true,
      result: list,
    });
  } catch (error) {
    console.error("Get customer list by id error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch list",
    });
  }
};

/**
 * PUT /api/customer/lists/:id
 * Update list items, name, or status
 */
export const updateList = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;
    const { name, items, isPinned, status, reminderDays } = req.body;

    const list = await CustomerList.findOne({ _id: id, customerId });
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Customer list not found",
      });
    }

    if (name && name.trim().toLowerCase() !== String(list.name).toLowerCase()) {
      const dup = await findDuplicateList({ customerId, name, excludeId: list._id });
      if (dup) return duplicateResponse(res, dup);
    }
    if (name) list.name = name.trim();
    if (typeof isPinned === "boolean") list.isPinned = isPinned;
    if (status) list.status = status;
    if (reminderDays !== undefined) {
      const days = Number(reminderDays) || 0;
      list.reminderDays = days;
      if (days <= 0) {
        list.nextReminderAt = null;
      } else if (list.nextReminderAt && list.lastOrderedAt) {
        // Reminder already armed for the current cycle: re-time it
        list.nextReminderAt = computeNextReminderAt(list.lastOrderedAt, days);
      }
    }

    if (Array.isArray(items) && items.length > 0) {
      const productIds = items.map((it) => it.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select("_id name nameHi nameGu sellerId price salePrice status stock")
        .lean();

      // Check single seller
      const sellerIds = Array.from(
        new Set(products.map((p) => String(p.sellerId || "")))
      );

      if (sellerIds.length > 1) {
        return res.status(400).json({
          success: false,
          code: "MULTIPLE_SELLERS_CONFLICT",
          message: "All items in a list must belong to the same local store/seller",
        });
      }

      list.sellerId = sellerIds[0] || list.sellerId;
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      list.items = items.map((it) => {
        const prod = productMap.get(String(it.productId));
        return {
          productId: it.productId,
          variantSku: it.variantSku || "",
          variantName: it.variantName || "",
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPriceSnapshot: Number(prod?.salePrice || prod?.price || it.unitPriceSnapshot || 0),
          addedAt: it.addedAt || new Date(),
        };
      });
    }

    await list.save();

    const populated = await CustomerList.findById(list._id)
      .populate({
        path: "items.productId",
        select: "name nameHi nameGu price salePrice images mainImage stock status approvalStatus unit weight",
      })
      .populate("sellerId", "shopName name storeName address city")
      .lean();

    return res.status(200).json({
      success: true,
      message: "List updated successfully",
      result: populated,
    });
  } catch (error) {
    console.error("Update customer list error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update list",
    });
  }
};

/**
 * DELETE /api/customer/lists/:id
 * Delete or soft-delete a list
 */
export const deleteList = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;

    const list = await CustomerList.findOneAndDelete({ _id: id, customerId });
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Customer list not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "List removed successfully",
    });
  } catch (error) {
    console.error("Delete customer list error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete list",
    });
  }
};

/**
 * POST /api/customer/lists/:id/add-to-cart
 * Prepare / bulk transfer all available items of a list into the active cart
 */
export const addListToCart = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;
    const { replaceCart = false } = req.body;

    const list = await CustomerList.findOne({ _id: id, customerId })
      .populate("items.productId")
      .lean();

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Customer list not found",
      });
    }

    const sellerId = String(list.sellerId);

    // Check existing customer cart for vendor conflicts
    const existingCart = await Cart.findOne({ customerId }).populate("items.productId");
    if (existingCart && existingCart.items.length > 0) {
      const existingSellerId = String(
        existingCart.items[0]?.productId?.sellerId || existingCart.items[0]?.sellerId || ""
      );

      if (existingSellerId && existingSellerId !== sellerId && !replaceCart) {
        return res.status(409).json({
          success: false,
          code: "VENDOR_CONFLICT",
          message: "Cart contains items from a different store. Replace cart?",
          existingSellerId,
          newSellerId: sellerId,
        });
      }
    }

    // Update list order metrics
    await CustomerList.findByIdAndUpdate(id, {
      lastOrderedAt: new Date(),
      $inc: { orderCount: 1 },
    });

    return res.status(200).json({
      success: true,
      message: "List items ready for cart placement",
      result: {
        sellerId,
        items: list.items,
      },
    });
  } catch (error) {
    console.error("Add list to cart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add list to cart",
    });
  }
};

/**
 * POST /api/customer/lists/:id/reminder/snooze
 * "Remind later" from the restock notification: push the reminder out.
 */
export const snoozeListReminderHandler = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const list = await snoozeListReminder({
      listId: req.params.id,
      customerId,
      hours: req.body?.hours,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Customer list not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "We'll remind you later",
      result: list,
    });
  } catch (error) {
    console.error("Snooze list reminder error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to snooze reminder",
    });
  }
};
