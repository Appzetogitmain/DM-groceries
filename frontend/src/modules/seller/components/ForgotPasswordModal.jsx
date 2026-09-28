import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, KeyRound, Lock, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { sellerApi } from "../services/sellerApi";

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetState = () => {
    setStep(1);
    setEmail("");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await sellerApi.sendResetOtp({ channel: "email", rawValue: email });
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 4) {
      toast.error("Please enter the 4-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await sellerApi.verifyResetOtp({
        channel: "email",
        rawValue: email,
        otp,
      });
      setResetToken(response.data?.result?.verificationToken || response.data?.result?.token);
      toast.success("OTP verified successfully");
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await sellerApi.resetPassword({
        channel: "email",
        rawValue: email,
        token: resetToken,
        newPassword,
      });
      toast.success("Password reset successfully. You can now login.");
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden border border-slate-100 font-['Outfit']"
          >
            {/* Header */}
            <div className="relative bg-[#0B3B24] p-6 text-center">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                {step === 1 && <KeyRound className="text-white" size={24} />}
                {step === 2 && <Mail className="text-white" size={24} />}
                {step === 3 && <Lock className="text-white" size={24} />}
              </div>
              <h2 className="text-xl font-bold text-white">
                {step === 1 && "Forgot Password"}
                {step === 2 && "Verify Email"}
                {step === 3 && "Reset Password"}
              </h2>
              <p className="text-white/70 text-xs mt-1">
                {step === 1 && "Enter your email to receive an OTP"}
                {step === 2 && `Enter the 4-digit OTP sent to ${email}`}
                {step === 3 && "Create a new secure password"}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.form
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSendOtp}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#1A4516] focus:ring-2 focus:ring-[#1A4516]/10 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1A4516] hover:bg-[#133A10] text-white rounded-lg py-3 text-xs font-black tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          SEND OTP
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {step === 2 && (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleVerifyOtp}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">
                        4-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="0000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-center text-lg font-black tracking-[0.5em] text-slate-700 outline-none focus:bg-white focus:border-[#1A4516] focus:ring-2 focus:ring-[#1A4516]/10 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 4}
                      className="w-full bg-[#1A4516] hover:bg-[#133A10] text-white rounded-lg py-3 text-xs font-black tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "VERIFY OTP"}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#1A4516] transition-colors"
                      >
                        Didn't receive code? Resend
                      </button>
                    </div>
                  </motion.form>
                )}

                {step === 3 && (
                  <motion.form
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleResetPassword}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">
                        New Password
                      </label>
                      <div className="relative group">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#1A4516] focus:ring-2 focus:ring-[#1A4516]/10 transition-all placeholder:text-slate-300 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#1A4516] focus:ring-2 focus:ring-[#1A4516]/10 transition-all placeholder:text-slate-300 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1A4516] hover:bg-[#133A10] text-white rounded-lg py-3 text-xs font-black tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> RESET PASSWORD
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;
