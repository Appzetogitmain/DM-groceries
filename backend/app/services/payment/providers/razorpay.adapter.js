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

  async initiatePayment({ merchantOrderId, amountPaise, redirectUrl, callbackUrl }) {
    const client = getRazorpayClient();
    
    // Create a payment link using reference_id to store our merchantOrderId
    const response = await client.paymentLink.create({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: merchantOrderId,
      description: "Order Payment",
      callback_url: redirectUrl,
      callback_method: "get"
    });

    return {
      redirectUrl: response.short_url,
      gatewayResponse: response,
    };
  }

  async getPaymentStatus({ merchantOrderId }) {
    const client = getRazorpayClient();
    
    // Find the payment link by reference_id
    const response = await client.paymentLink.all({ reference_id: merchantOrderId });
    
    const items = response.payment_links || response.items;
    if (!items || items.length === 0) {
       const err = new Error("Payment link not found");
       err.statusCode = 404;
       throw err;
    }

    const paymentLink = items.find(item => item.reference_id === merchantOrderId) || items[0];
    
    return {
      state: paymentLink.status,
      transactionId: paymentLink.id, // using payment link id as transaction id for now
      responseCode: paymentLink.status,
      gatewayResponse: paymentLink,
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
    
    const paymentLink = jsonPayload.payload?.payment_link?.entity;
    if (!paymentLink) {
        // Just return a generic parsed response if payment link is not present
        // (Could be another type of event).
        return {
           eventId: crypto.randomUUID(), // Fallback
           raw: jsonPayload
        };
    }

    const stableEventId = jsonPayload.id || crypto.randomUUID();

    return {
      eventId: stableEventId,
      merchantOrderId: paymentLink.reference_id,
      state: paymentLink.status,
      transactionId: paymentLink.id,
      responseCode: paymentLink.status,
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
