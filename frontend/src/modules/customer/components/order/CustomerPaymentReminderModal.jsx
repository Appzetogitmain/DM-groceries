import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Clock, AlertTriangle, ArrowRight, X, Volume2, Banknote, Loader2 } from 'lucide-react';
import orderAlertSound from '@/assets/sounds/order_alert.mp3';

export default function CustomerPaymentReminderModal({
  isOpen,
  orderId,
  expiresAt,
  amount,
  isOnlinePaymentEnabled = true,
  isCodEnabled = true,
  isLoading = false,
  onPayNow,
  onPayCod,
  onClose
}) {
  const [timeLeft, setTimeLeft] = useState('02:00');
  const [percent, setPercent] = useState(100);
  const [localProcessing, setLocalProcessing] = useState(null);
  const ringtoneRef = useRef(null);

  // Play audio ringtone in a loop while modal is open
  useEffect(() => {
    if (!isOpen) {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      return;
    }

    const audio = new Audio(orderAlertSound);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.9;
    ringtoneRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy prevented playback, attach one-time user interaction listener
        const unlock = () => {
          audio.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
      });
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }
    };
  }, [isOpen]);

  // Countdown timer calculation
  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, targetTime - now);

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

      // 2 minutes = 120,000ms
      const pct = Math.max(0, Math.min(100, (remaining / 120000) * 100));
      setPercent(pct);

      if (remaining <= 0) {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
        }
        onClose && onClose();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expiresAt, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setLocalProcessing(null);
    }
  }, [isOpen]);

  const isBusy = isLoading || Boolean(localProcessing);

  const handlePay = () => {
    if (isBusy) return;
    setLocalProcessing('ONLINE');
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    onPayNow && onPayNow(orderId);
  };

  const handleCod = () => {
    if (isBusy) return;
    setLocalProcessing('COD');
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    onPayCod && onPayCod(orderId);
  };

  const handleDismiss = () => {
    if (isBusy) return;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Dark Backdrop with heavy blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={handleDismiss}
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border-4 border-amber-400/30 overflow-hidden"
        >
          {/* Header Banner with vibrant alert gradient */}
          <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 p-6 text-white text-center overflow-hidden">
            {/* Top close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm flex items-center justify-center text-white transition-all active:scale-90"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>

            {/* Glowing animated pulsing icon */}
            <div className="relative mx-auto mb-3 w-20 h-20 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
              <div className="relative w-16 h-16 rounded-full bg-white text-orange-600 shadow-xl flex items-center justify-center animate-bounce">
                <CreditCard size={32} className="text-orange-600" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-[11px] font-black uppercase tracking-widest text-amber-100 mb-1 border border-white/10">
              <Volume2 size={12} className="animate-pulse" />
              Payment Reminder
            </span>
            <h2 className="text-2xl font-black tracking-tight leading-tight uppercase drop-shadow-sm">
              2 Minutes Remaining!
            </h2>
            <p className="text-xs text-amber-100 font-semibold mt-1">
              Order #{orderId} is awaiting your payment
            </p>
          </div>

          {/* Body Section */}
          <div className="p-6 space-y-5 text-center">
            {/* Countdown Badge & Mini Progress Bar */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-amber-600 animate-spin-slow" />
                  Time Left to Pay:
                </span>
                <span className="font-mono text-xl font-black text-red-600 bg-white px-3 py-1 rounded-xl shadow-inner border border-red-200">
                  {timeLeft}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden p-0.5 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {amount && (
                <div className="pt-1 flex items-center justify-between text-xs font-medium text-slate-700 border-t border-amber-200/40">
                  <span>Payable Amount:</span>
                  <span className="text-base font-black text-slate-900">₹{amount}</span>
                </div>
              )}
            </div>

            {/* Warning Note */}
            <p className="text-xs text-slate-600 font-medium leading-relaxed px-2">
              The seller has <span className="font-bold text-emerald-700">accepted</span> your order. Please complete your payment now. If payment is not completed in time, your order will be{' '}
              <span className="font-bold text-red-600">automatically cancelled</span>.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {isOnlinePaymentEnabled && (
                <button
                  onClick={handlePay}
                  disabled={isBusy}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3.5 px-6 rounded-2xl text-sm shadow-xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {localProcessing === 'ONLINE' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Pay Online {amount ? `(₹${amount})` : ''}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}

              {isCodEnabled && (
                <button
                  onClick={handleCod}
                  disabled={isBusy}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {localProcessing === 'COD' || (isLoading && localProcessing !== 'ONLINE') ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-amber-400" />
                      <span>Confirming Cash on Delivery...</span>
                    </>
                  ) : (
                    <>
                      <Banknote size={18} className="text-amber-400" />
                      <span>Cash on Delivery (COD)</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleDismiss}
                disabled={isBusy}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-colors"
              >
                Dismiss & Review Order
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
