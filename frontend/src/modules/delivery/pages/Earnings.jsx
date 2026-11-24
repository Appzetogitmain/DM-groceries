import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  Download,
  Info,
  Building2,
  TrendingDown,
} from "lucide-react";
import { formatOrderId } from "@/lib/utils";
import Modal from "@/shared/components/ui/Modal";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { deliveryApi } from "../services/deliveryApi";
import { onNotificationNew } from '@core/services/orderSocket';
import { useAuth } from '@core/context/AuthContext';
import { useDeliveryTranslation as useTranslation } from "../i18n/useDeliveryTranslation";
import { deliveryLocale } from "../i18n/format";
import { translateLabel } from "../i18n/format";

const Earnings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    incentives: 0,
    bonuses: 0,
    onlinePay: 0,
    cashCollected: 0,
    chartData: [],
    recentTransactions: [],
    balances: { availableBalance: 0, pendingBalance: 0 }
  });

  const fetchEarnings = async (timeframe = activeTab) => {
    try {
      setLoading(true);
      const earningsRes = await deliveryApi.getEarnings({ timeframe });
      if (earningsRes.data.success && earningsRes.data.result) {
        const result = earningsRes.data.result;
        setEarningsData({
          totalEarnings: result.totalEarnings || 0,
          incentives: result.incentives || 0,
          bonuses: result.bonuses || 0,
          onlinePay: result.onlinePay || 0,
          cashCollected: result.cashCollected || 0,
          chartData: result.chartData || [],
          recentTransactions: result.transactions || result.recentTransactions || [],
          balances: result.balances || { availableBalance: 0, pendingBalance: 0 }
        });
      }
    } catch (error) {
      toast.error(t("dEarnings.failed_to_fetch_earnings_data"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithdrawal = async (e) => {
    e.preventDefault();
    const available = Number(earningsData.balances?.availableBalance || 0);

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > available) {
        toast.error(t("dEarnings.please_enter_a_valid_amount", { available }));
        return;
    }

    try {
        setIsSubmitting(true);
        const response = await deliveryApi.requestWithdrawal({ amount: parseFloat(withdrawAmount) });
        if (response.data.success) {
            toast.success(t("dEarnings.withdrawal_request_submitted_successfull"));
            setIsModalOpen(false);
            setWithdrawAmount('');
            fetchEarnings();
        }
    } catch (error) {
        toast.error(error.response?.data?.message || t("dEarnings.failed_to_submit_request"));
    } finally {
        setIsSubmitting(false);
    }
  };

  const { getToken } = useAuth();

  React.useEffect(() => {
    fetchEarnings(activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    const cleanupSocket = onNotificationNew(getToken, (payload) => {
        if (
            payload?.eventType?.includes('WALLET_CREDIT') || 
            payload?.eventType?.includes('WALLET_DEBIT') || 
            payload?.eventType === 'ORDER_DELIVERED'
        ) {
            fetchEarnings(activeTab);
        }
    });
    return cleanupSocket;
  }, [getToken, activeTab]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm p-6 sticky top-0 z-30">
        <div className="flex justify-between items-center mb-4">
          <h1 className="ds-h2 text-gray-900">{t("dEarnings.my_earnings")}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="text-xs font-bold bg-[#1A4516] text-white hover:bg-[#133A10] border-none rounded-xl">
             {t("dEarnings.withdraw_funds")}
            </Button>
            <Button variant="ghost" size="icon">
              <Download size={20} className="text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {["today", "weekly", "monthly"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${activeTab === tab
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className="p-6 space-y-6 max-w-lg mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        {/* Total Earnings Card */}
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-primary to-brand-600 rounded-2xl p-6 text-white shadow-lg shadow-primary/30 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-10 -mb-10 blur-xl"></div>

            <p className="text-brand-100 font-medium text-sm uppercase tracking-wide mb-1 relative z-10">
             {t("dEarnings.total_earnings")}
            </p>
            <div className="flex items-baseline mb-6 relative z-10">
              <span className="text-3xl font-bold mr-1">{"\u20B9"}</span>
              <span className="text-5xl font-extrabold tracking-tight">
                {earningsData.totalEarnings.toLocaleString(deliveryLocale())}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20 relative z-10">
              <div>
                <p className="text-brand-100 text-xs mb-1">{t("dEarnings.incentives")}</p>
                <p className="font-bold text-lg">+{"\u20B9"}{earningsData.incentives}</p>
              </div>
              <div>
                <p className="text-brand-100 text-xs mb-1">{t("dEarnings.bonuses")}</p>
                <p className="font-bold text-lg">+{"\u20B9"}{earningsData.bonuses}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chart */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 h-80">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 flex items-center">
                <TrendingUp size={20} className="mr-2 text-brand-500" />
               {t("dEarnings.earnings_trend")}
              </h3>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
               {t("dEarnings.last_7_days")}
              </Button>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={earningsData.chartData} barSize={20}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="earnings"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="incentives"
                  fill="#93c5fd"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                 {t("dEarnings.cod_cash_management")}
                </p>
                <p className="text-3xl font-extrabold text-gray-900">
                  {"\u20B9"}{Number(codCash.systemFloatCOD || 0).toLocaleString(deliveryLocale())}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                 {t("dEarnings.net_cash_to_remit_gross")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/delivery/cod-cash")}
                  className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                  size="sm"
                >
                 {t("dEarnings.manage_cash")}
                </Button>
                <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                  <IndianRupee size={22} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase">
                 {t("dEarnings.cash_in_hand")}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {"\u20B9"}{Number(codCash.cashInHand || 0).toLocaleString(deliveryLocale())}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase">
                 {t("dEarnings.pending_orders")}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {(Array.isArray(codCash.toRemit) ? codCash.toRemit.length : 0) +
                    (Array.isArray(codCash.toCollect) ? codCash.toCollect.length : 0)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(Array.isArray(codCash.toCollect) ? codCash.toCollect : []).slice(0, 3).map((row) => (
                <div
                  key={`collect-${row.orderId}`}
                  className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/40 p-3"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t("dEarnings.order", { v1: formatOrderId(row.orderId) })}
                    </p>
                    <p className="text-xs text-gray-600">
                     {t("dEarnings.collect_from_customer_gross")} {"\u20B9"}{Number(row.amountGross || 0).toLocaleString(deliveryLocale())}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-orange-700">
                    {"\u20B9"}{Number(row.amountNetExpected || 0).toLocaleString(deliveryLocale())}
                  </p>
                </div>
              ))}

              {(Array.isArray(codCash.toRemit) ? codCash.toRemit : []).slice(0, 5).map((row) => (
                <div
                  key={row.orderId}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t("dEarnings.order", { v1: formatOrderId(row.orderId) })}
                    </p>
                    <p className="text-xs text-gray-500">
                     {t("dEarnings.remit_to_platform_net_of")}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {"\u20B9"}{Number(row.amountNetPending || 0).toLocaleString(deliveryLocale())}
                  </p>
                </div>
              ))}

              {((!Array.isArray(codCash.toRemit) || codCash.toRemit.length === 0) &&
                (!Array.isArray(codCash.toCollect) || codCash.toCollect.length === 0)) && (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                 {t("dEarnings.no_cod_cash_pending")}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">{t("dEarnings.recent_withdrawals")}</h3>
              <Button
                variant="link"
                className="text-primary text-xs font-bold h-auto p-0">
               {t("dEarnings.view_all")}
              </Button>
            </div>
            <div className="divide-y divide-gray-100">
              {earningsData.recentTransactions.length > 0 ? earningsData.recentTransactions.map((txn, idx) => (
                <div
                  key={txn._id || txn.id || `txn-${idx}`}
                  className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-full mr-3 ${txn.status === "Settled" || txn.status === "Completed" ? "bg-brand-100 text-brand-600" : "bg-yellow-100 text-yellow-600"}`}>
                      <ArrowUpRight size={16} />
                    </div>
                      <div className="flex-1">
                        <p className="font-bold text-xs text-gray-900">
                          {txn.reference && String(txn.reference).startsWith("RET-DEL-") ? t("dEarnings.return_earning") : translateLabel(t, txn.type)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {(() => {
                            const dateStr = txn.date || txn.createdAt;
                            if (!dateStr) return "N/A";
                            const d = new Date(dateStr);
                            return isNaN(d.getTime()) ? txn.date : d.toLocaleString(deliveryLocale(), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true
                            });
                          })()}{" "}
                          {"•"}{" "}
                          {txn.id ||
                            (txn._id ? txn._id.toString().slice(-6).toUpperCase() : "N/A")}
                        </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{txn.type.includes('Withdrawal') || txn.amount < 0 ? '-' : '+'}{"\u20B9"}{Math.abs(txn.amount)}</p>
                    <p
                      className={`text-xs font-bold ${txn.status === "Settled" || txn.status === "Completed" ? "text-brand-500" : "text-yellow-500"}`}>
                      {txn.status}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                 {t("dEarnings.no_recent_earnings_or_withdrawals")}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Request Modal */}
      <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title={t("dEarnings.request_withdrawal")}
      >
          <form onSubmit={handleSubmitWithdrawal} className="space-y-6 py-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                      <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1">{t("dEarnings.available_to_withdraw")}</p>
                      <h4 className="text-2xl font-black text-brand-600">₹{Number(earningsData.balances?.availableBalance || 0).toLocaleString(deliveryLocale())}</h4>
                  </div>
                  <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Info className="h-6 w-6 text-slate-300" />
                  </div>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 block ml-1">{t("dEarnings.enter_amount")}</label>
                      <div className="relative group">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-brand-500 transition-colors">₹</span>
                          <input
                              type="number"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-12 pr-6 py-4 bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 rounded-2xl text-xl font-black outline-none transition-all placeholder:text-slate-200"
                          />
                      </div>
                  </div>

                  <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100/50 space-y-3">
                      <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">{t("dEarnings.transfer_destination")}</p>
                      <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <Building2 className="h-5 w-5 text-brand-400" />
                          </div>
                          <div className="flex-1">
                              <p className="text-xs font-black text-slate-900 uppercase">{t("dEarnings.bank_transfer")}</p>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{t("dEarnings.registered_bank_account")}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                      </div>
                  </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                  <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
                  >
                      {isSubmitting ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : t("dEarnings.submit_request")}
                  </button>
                  <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full py-2 text-xs font-black text-slate-600 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                     {t("dEarnings.nevermind_keep_funds")}
                  </button>
              </div>
          </form>
      </Modal>

    </div>
  );
};

export default Earnings;
