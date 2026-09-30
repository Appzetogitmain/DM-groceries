import crypto from "crypto";
import Razorpay from "razorpay";
import { PAYMENT_STATUS, PAYMENT_GATEWAY } from "../../../constants/payment.js";
import { PaymentProviderPort } from "../ports/paymentProviderPort.js";

let _razorpayClient = null;

function buildRazorpayClient() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getRazorpayClient() {
  if (_razorpayClient) return _razorpayClient;
  _razorpayClient = buildRazorpayClient();
  return _razorpayClient;
}

export class RazorpayAdapter extends PaymentProviderPort {
  get providerName() {
    return PAYMENT_GATEWAY.RAZORPAY;
  }

  async initiatePayment({ merchantOrderId, amountPaise, redirectUrl }) {
    const client = getRazorpayClient();

    // Standard Checkout (Orders API): the frontend opens the Razorpay modal,
    // which launches UPI apps correctly. Payment Links used a hosted page where
    // `phonepe://` intents failed with ERR_UNKNOWN_URL_SCHEME.
    let order;
    try {
      order = await client.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: merchantOrderId,
        notes: { merchantOrderId },
      });
    } catch (e) {
      // Razorpay SDK errors carry `statusCode` + `error.description` but no
      // `message`, which made the API respond with an empty message.
      const err = new Error(e?.error?.description || e?.message || "Payment gateway error");
      err.statusCode = e?.statusCode || 502;
      throw err;
    }

    return {
      redirectUrl,
      checkout: {
        provider: "razorpay",
        keyId: String(process.env.RAZORPAY_KEY_ID || "").trim(),
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      gatewayResponse: order,
    };
  }

  async getPaymentStatus({ merchantOrderId }) {
    const client = getRazorpayClient();
    
    // Find the payment link by reference_id
    const found = await client.orders.all({ receipt: merchantOrderId });
    const order = (found.items || []).find((o) => o.receipt === merchantOrderId);
    if (!order) {
      const err = new Error("Razorpay order not found");
      err.statusCode = 404;
      throw err;
    }

    const paymentsResp = await client.orders.fetchPayments(order.id);
    const payments = paymentsResp.items || [];
    const captured = payments.find((p) => p.status === "captured");

    if (order.status === "paid" || captured) {
      return {
        state: "paid",
        transactionId: (captured || payments[0])?.id || order.id,
        responseCode: "paid",
        gatewayResponse: order,
      };
    }
    return {
      state: order.status, // created | attempted
      transactionId: order.id,
      responseCode: order.status,
      gatewayResponse: order,
    };
  }

  async validateWebhook({ rawBody, authorization }) {
    const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "").trim();
    return Razorpay.validateWebhookSignature(rawBody.toString("utf8"), authorization, secret);
  }

  async decodeWebhookPayload({ rawBody }) {
    let jsonPayload;
    try {
      jsonPayload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      const err = new Error("Invalid format: Webhook body must be JSON");
      err.statusCode = 400;
      throw err;
    }
    
    const paymentEntity = jsonPayload.payload?.payment?.entity;
    const orderEntity = jsonPayload.payload?.order?.entity;
    const merchantOrderId =
      paymentEntity?.notes?.merchantOrderId ||
      orderEntity?.receipt ||
      orderEntity?.notes?.merchantOrderId;
    const isPaid =
      jsonPayload.event === "order.paid" || jsonPayload.event === "payment.captured";
    if (!merchantOrderId || !isPaid) {
      // Other events (e.g. payment.failed) are per-attempt; the customer can
      // retry in the same checkout, so they must not cancel the order.
      return {
        eventId: jsonPayload.id || crypto.randomUUID(),
        raw: jsonPayload,
      };
    }

    return {
      eventId: jsonPayload.id || crypto.randomUUID(),
      merchantOrderId,
      state: "paid",
      transactionId: paymentEntity?.id || orderEntity?.id,
      responseCode: "paid",
      raw: jsonPayload,
    };
  }

  mapStatusToInternal(gatewayState) {
    const normalized = String(gatewayState || "").toUpperCase();
    if (normalized === "PAID") return PAYMENT_STATUS.CAPTURED;
    if (normalized === "FAILED" || normalized === "CANCELLED") return PAYMENT_STATUS.FAILED;
    if (normalized === "CREATED" || normalized === "ISSUED" || normalized === "PENDING") return PAYMENT_STATUS.PENDING;
    return PAYMENT_STATUS.PENDING;
  }
}

export default RazorpayAdapter;
