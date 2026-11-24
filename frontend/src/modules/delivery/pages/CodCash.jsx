import React from "react";
import { motion } from "framer-motion";
import { Calendar, ReceiptText, CircleDollarSign, Loader2, DollarSign, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, RotateCw, IndianRupee } from "lucide-react";
import { formatOrderId } from "@/lib/utils";
import { toast } from "sonner";
import Card from "@/shared/components/ui/Card";
import Button from "@/shared/components/ui/Button";
import { deliveryApi } from "../services/deliveryApi";
import { useDeliveryTranslation as useTranslation } from "../i18n/useDeliveryTranslation";
import { deliveryLocale } from "../i18n/format";

const RUPEE = "\u20B9";

function safeMoney(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

const CodCash = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState("");
  const [data, setData] = React.useState({
    systemFloatCOD: 0,
    cashInHand: 0,
    toCollect: [],
    toRemit: [],
  });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await deliveryApi.getCodCashSummary();
      if (res.data.success && res.data.result) {
        const result = res.data.result;
        const nextToRemit = Array.isArray(result.toRemit) ? result.toRemit : [];
        const nextPayable = nextToRemit.reduce(
          (sum, row) => sum + safeMoney(row.amountNetPending),
          0,
        );
        setData({
          systemFloatCOD: safeMoney(result.systemFloatCOD),
          cashInHand: safeMoney(result.cashInHand),
          toCollect: Array.isArray(result.toCollect) ? result.toCollect : [],
          toRemit: nextToRemit,
        });
        setPayAmount(nextPayable > 0 ? String(nextPayable) : "");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || t("dCodCash.failed_to_load_cod_cash"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  const pendingOrdersCount =
    (Array.isArray(data.toCollect) ? data.toCollect.length : 0) +
    (Array.isArray(data.toRemit) ? data.toRemit.length : 0);
  const payableNowAmount = (Array.isArray(data.toRemit) ? data.toRemit : []).reduce(
    (sum, row) => sum + safeMoney(row.amountNetPending),
    0,
  );
  const enteredPayAmount = safeMoney(payAmount);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    if (paying) return;
    if (enteredPayAmount <= 0) {
      toast.error(t("dCodCash.enter_an_amount_to_pay"));
      return;
    }
    if (enteredPayAmount > payableNowAmount) {
      toast.error(t("dCodCash.you_can_pay_up_to", { RUPEE, v2: safeMoney(payableNowAmount).toLocaleString(deliveryLocale()) }));
      return;
    }

    try {
      setPaying(true);
      
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error(t("dCodCash.failed_to_load_payment_gateway"));
        setPaying(false);
        return;
      }

      const initRes = await deliveryApi.initiateCodDeposit({ amount: enteredPayAmount });
      const { orderId, amount, key } = initRes.data?.result || {};

      if (!orderId || !key) {
        toast.error(t("dCodCash.failed_to_initialize_payment"));
        setPaying(false);
        return;
      }

      const options = {
        key: key,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "DM Groceries",
        description: t("dCodCash.cod_cash_deposit"),
        order_id: orderId,
        handler: async function (response) {
          try {
            setPaying(true);
            const verifyRes = await deliveryApi.verifyCodDeposit({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: enteredPayAmount
            });
            const result = verifyRes.data?.result || {};
            toast.success(
              t("dCodCash.deposited_successfully", { RUPEE, v2: safeMoney(result.totalSubmitted).toLocaleString(deliveryLocale()) })
            );
            await fetchSummary();
          } catch (verifyError) {
            toast.error(verifyError?.response?.data?.message || t("dCodCash.payment_verification_failed"));
          } finally {
            setPaying(false);
            setPayAmount("");
          }
        },
        theme: {
          color: "#f97316" // Tailwind orange-500
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (response) {
        toast.error(response.error.description || t("dCodCash.payment_failed"));
        setPaying(false);
      });
      
      razorpayInstance.open();
    } catch (error) {
      toast.error(error?.response?.data?.message || t("dCodCash.failed_to_initiate_cod_deposit"));
      setPaying(false);
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24">
      <div className="bg-white shadow-sm p-6 sticky top-0 z-30">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="ds-h2 text-gray-900">{t("dCodCash.cod_cash")}</h1>
            <p className="text-xs text-gray-500 mt-1">
             {t("dCodCash.simple_view_of_what_you")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={loading}
            onClick={fetchSummary}
            aria-label={t("dCodCash.refresh")}
          >
            <RotateCw size={18} className={loading ? "animate-spin text-gray-400" : "text-gray-600"} />
          </Button>
        </div>
      </div>

      <motion.div
        className="p-6 space-y-6 max-w-lg mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                 {t("dCodCash.cash_to_submit")}
                </p>
                <p className="text-3xl font-extrabold text-gray-900">
                  {RUPEE}
                  {safeMoney(data.systemFloatCOD).toLocaleString(deliveryLocale())}
                </p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                 {t("dCodCash.this_is_the_platform_money")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                <IndianRupee size={22} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase">
                 {t("dCodCash.cash_in_hand")}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {RUPEE}
                  {safeMoney(data.cashInHand).toLocaleString(deliveryLocale())}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase">
                 {t("dCodCash.pending_orders")}
                </p>
                <p className="text-lg font-bold text-gray-900">{pendingOrdersCount}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-orange-700 uppercase">
                     {t("dCodCash.ready_to_pay_now")}
                    </p>
                    <p className="text-xl font-extrabold text-gray-900 mt-1">
                      {RUPEE}
                      {safeMoney(payableNowAmount).toLocaleString(deliveryLocale())}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                     {t("dCodCash.only_cash_from_collected_orders")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-orange-700 uppercase">
                   {t("dCodCash.enter_amount")}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 rounded-xl border border-orange-200 bg-white px-4 py-3">
                      <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                       {t("dCodCash.amount_to_pay")}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{RUPEE}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder={t("dCodCash.enter_amount_2")}
                          disabled={paying}
                          className="w-full bg-transparent outline-none text-lg font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handlePayNow}
                      disabled={paying || enteredPayAmount <= 0}
                      className="shrink-0"
                    >
                      {paying ? t("dCodCash.paying") : t("dCodCash.pay_admin")}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{t("dCodCash.max_you_can_pay_right", { RUPEE, v2: safeMoney(payableNowAmount).toLocaleString(deliveryLocale()) })}
                  </p>
                  {payableNowAmount <= 0 && (
                    <p className="text-xs text-orange-700 mt-1">
                     {t("dCodCash.you_can_pay_after_cod")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-1">{t("dCodCash.to_collect_from_customer")}</h3>
            <p className="text-xs text-gray-500 mb-4">
             {t("dCodCash.these_cod_orders_are_not")}
            </p>

            <div className="space-y-2">
              {(Array.isArray(data.toCollect) ? data.toCollect : []).slice(0, 20).map((row) => (
                <div
                  key={`collect-${row.orderId}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-orange-100 bg-orange-50/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate" title={t("dCodCash.order_2", { orderId: row.orderId })}>{t("dCodCash.order", { v1: formatOrderId(row.orderId) })}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{t("dCodCash.collect_gross", { RUPEE, v2: safeMoney(row.amountGross).toLocaleString(deliveryLocale()) })}</p>
                  </div>
                  <div className="shrink-0 text-right mt-0.5">
                    <p className="text-sm font-extrabold text-orange-700">
                      {RUPEE}
                      {safeMoney(row.amountNetExpected).toLocaleString(deliveryLocale())}
                    </p>
                  </div>
                </div>
              ))}

              {(!Array.isArray(data.toCollect) || data.toCollect.length === 0) && (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                 {t("dCodCash.nothing_to_collect_right_now")}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-1">{t("dCodCash.to_submit_to_platform")}</h3>
            <p className="text-xs text-gray-500 mb-4">
             {t("dCodCash.these_orders_are_marked_collected")}
            </p>

            <div className="space-y-2">
              {(Array.isArray(data.toRemit) ? data.toRemit : []).slice(0, 20).map((row) => (
                <div
                  key={`remit-${row.orderId}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate" title={t("dCodCash.order_2", { orderId: row.orderId })}>{t("dCodCash.order", { v1: formatOrderId(row.orderId) })}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{t("dCodCash.submit_to_platform_net")}</p>
                  </div>
                  <div className="shrink-0 text-right mt-0.5">
                    <p className="text-sm font-extrabold text-gray-900">
                      {RUPEE}
                      {safeMoney(row.amountNetPending).toLocaleString(deliveryLocale())}
                    </p>
                  </div>
                </div>
              ))}

              {(!Array.isArray(data.toRemit) || data.toRemit.length === 0) && (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                 {t("dCodCash.nothing_to_submit_right_now")}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CodCash;
