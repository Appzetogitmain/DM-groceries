import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Clock, AlertTriangle, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

const DEFAULT_TOTAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default function PaymentPendingProgressBar({
  order,
  onPayNow,
  isProcessingPayment = false,
  isOnlinePaymentEnabled = true,
  onExpired
}) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [percent, setPercent] = useState(100);

  useEffect(() => {
    if (!order?.customerPaymentPendingExpiresAt) return;

    const expiresAt = new Date(order.customerPaymentPendingExpiresAt).getTime();
    const acceptedAt = order.sellerAcceptedAt ? new Date(order.sellerAcceptedAt).getTime() : expiresAt - DEFAULT_TOTAL_WINDOW_MS;
    const totalDuration = Math.max(1000, expiresAt - acceptedAt) || DEFAULT_TOTAL_WINDOW_MS;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      
      const pct = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
      setPercent(pct);

      if (remaining <= 0 && onExpired) {
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order?.customerPaymentPendingExpiresAt, order?.sellerAcceptedAt, onExpired]);

  if (!order?.customerPaymentPendingExpiresAt || timeLeft === null) return null;

  const isCritical = percent <= 20; // < 1 min
  const isUrgent = percent <= 40;   // <= 2 mins

  const barColor = isCritical
    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600'
    : isUrgent
    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
    : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500';

  const badgeBg = isCritical
    ? 'bg-red-50 text-red-700 border-red-200'
    : isUrgent
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

  const pulseColor = isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

  const totalAmount = order?.pricing?.total ?? order?.total ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 overflow-hidden relative"
    >
      {/* Background ambient glow */}
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
          isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${pulseColor} animate-ping`} />
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${badgeBg}`}>
            {isCritical
              ? 'Urgent: Expiring Soon'
              : isUrgent
              ? 'Final 2 Minutes'
              : 'Seller Accepted • Complete Payment'}
          </span>
        </div>

        {/* Live Countdown Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black tracking-wider transition-colors duration-300 shadow-sm ${
            isCritical
              ? 'bg-red-600 text-white animate-pulse'
              : isUrgent
              ? 'bg-amber-500 text-white animate-bounce'
              : 'bg-slate-900 text-white'
          }`}
        >
          <Clock size={14} className="animate-spin-slow" />
          <span className="font-mono text-sm">{timeLeft}</span>
          <span className="text-[10px] font-semibold opacity-80 uppercase">left</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5 mb-4 relative z-10">
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
          <motion.div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-700 font-bold px-0.5">
          <span>5-Minute Window</span>
          <span className={isCritical ? 'text-red-700 font-black animate-pulse' : isUrgent ? 'text-amber-800 font-black' : 'text-slate-700'}>
            {isCritical
              ? 'Auto-cancellation imminent!'
              : isUrgent
              ? 'Only 2 minutes remaining'
              : 'Time remaining to pay'}
          </span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 relative z-10 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {isOnlinePaymentEnabled
              ? `Amount payable: `
              : `Online payment unavailable. Switch to COD: `}
            <span className="text-base font-black text-slate-900 ml-1">₹{totalAmount}</span>
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            If payment is not completed before the timer ends, this order will be automatically cancelled.
          </p>
        </div>

        <div className="shrink-0">
          {isOnlinePaymentEnabled ? (
            <button
              onClick={() => onPayNow('ONLINE')}
              disabled={isProcessingPayment}
              className={`w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-black text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                isCritical
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                  : isUrgent
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
              } disabled:opacity-70`}
            >
              <CreditCard size={16} />
              <span>{isProcessingPayment ? 'Processing...' : 'Pay Now'}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => onPayNow('COD')}
              disabled={isProcessingPayment}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <MapPin size={16} />
              <span>Switch to COD</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
