import Product from "../models/product.js";
import StockHistory from "../models/stockHistory.js";
import handleResponse from "../utils/helper.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import {
    createLowStockAlertCandidate,
    isLowStockAlertsEnabled,
} from "../services/lowStockAlertService.js";

/* ===============================
   ADJUST STOCK MANUALLY
================================ */
export const adjustStock = async (req, res) => {
    try {
        const { productId, variantId, variantSku, type, quantity, note } = req.body;
        const sellerId = req.user.id;

        const product = await Product.findOne({ _id: productId, sellerId });
        if (!product) {
            return handleResponse(res, 404, "Product not found or unauthorized");
        }

        const qtyChange = Math.abs(Number(quantity));
        if (isNaN(qtyChange) || qtyChange <= 0) {
            return handleResponse(res, 400, "Valid quantity is required");
        }

        let variant = null;
        if (variantId || variantSku) {
            if (Array.isArray(product.variants) && product.variants.length > 0) {
                variant = product.variants.find(
                    (v) =>
                        (variantId && v._id && v._id.toString() === variantId.toString()) ||
                        (variantSku && v.sku && v.sku.toString().trim() === variantSku.toString().trim())
                );
            }
            if (!variant) {
                return handleResponse(res, 404, "Selected variant not found on product");
            }
        }

        const previousStock = Number(product.stock || 0);
        let finalStock;
        let variantInfo = "";

        if (variant) {
            const previousVarStock = Number(variant.stock || 0);
            const finalVarStock = type === 'Restock' ? previousVarStock + qtyChange : previousVarStock - qtyChange;
            if (finalVarStock < 0) {
                return handleResponse(res, 400, "Variant stock cannot be negative");
            }
            variant.stock = finalVarStock;
            variantInfo = ` (${variant.name || 'Variant'}${variant.sku ? ` - ${variant.sku}` : ''})`;

            // Recalculate top-level product stock as sum of all variants
            finalStock = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
            product.stock = finalStock;
        } else {
            finalStock = type === 'Restock' ? previousStock + qtyChange : previousStock - qtyChange;
            if (finalStock < 0) {
                return handleResponse(res, 400, "Stock cannot be negative");
            }
            product.stock = finalStock;
        }

        // 1. Update Product Stock
        await product.save();

        // 2. Create History Entry
        const defaultNote = `Manual ${type} adjustment${variantInfo}`;
        const finalNote = note ? (variantInfo ? `${note}${variantInfo}` : note) : defaultNote;

        const historyEntry = new StockHistory({
            product: productId,
            seller: sellerId,
            type, // Restock, Correction
            quantity: type === 'Restock' ? qtyChange : -qtyChange,
            note: finalNote
        });

        await historyEntry.save();

        if (
            type !== 'Restock' &&
            qtyChange > 0 &&
            await isLowStockAlertsEnabled()
        ) {
            const lowStockAlert = createLowStockAlertCandidate({
                product,
                previousStock,
                currentStock: finalStock,
            });
            if (lowStockAlert) {
                emitNotificationEvent(NOTIFICATION_EVENTS.LOW_STOCK_ALERT, lowStockAlert);
            }
        }

        return handleResponse(res, 200, "Stock adjusted successfully", {
            newStock: product.stock,
            historyEntry
        });

    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET STOCK HISTORY LOG
================================ */
export const getStockHistory = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const history = await StockHistory.find({ seller: sellerId })
            .sort({ createdAt: -1 })
            .populate("product", "name sku mainImage");

        return handleResponse(res, 200, "Stock history fetched", history.map(item => ({
            id: item._id,
            productName: item.product?.name || "Deleted Product",
            sku: item.product?.sku || "N/A",
            type: item.type,
            quantity: item.quantity > 0 ? `+${item.quantity}` : `${item.quantity}`,
            date: item.createdAt.toISOString().split('T')[0],
            time: item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: item.note
        })));

    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
