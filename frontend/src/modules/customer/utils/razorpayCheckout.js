const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Opens the Razorpay Checkout modal for a backend-created Razorpay order.
 * The modal launches UPI apps correctly, unlike hosted payment links.
 *
 * `checkout` is the object returned by the backend
 * ({ keyId, razorpayOrderId, amount, currency }).
 * Resolves with { paid: true } after success, { paid: false } if dismissed.
 */
export const openRazorpayCheckout = async ({ checkout, prefill = {}, description = "Order Payment" }) => {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Unable to load the payment gateway. Check your connection and try again.");
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amount,
      currency: checkout.currency || "INR",
      name: "DM Groceries",
      description,
      prefill,
      theme: { color: "#1A4516" },
      handler: () => resolve({ paid: true }),
      modal: { ondismiss: () => resolve({ paid: false }) },
    });
    rzp.on("payment.failed", (resp) => {
      // The customer can retry inside the modal; only log the attempt.
      console.warn("[Razorpay] payment attempt failed:", resp?.error?.description);
    });
    try {
      rzp.open();
    } catch (err) {
      reject(err);
    }
  });
};
