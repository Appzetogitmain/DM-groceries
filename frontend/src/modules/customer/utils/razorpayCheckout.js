const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

// Call early (e.g. on page mount) so the popup opens instantly on tap.
export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => {
        scriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};

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
      handler: (response) => resolve({ paid: true, response }),
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
