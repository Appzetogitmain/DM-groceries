import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  ChevronLeft,
  User,
  Bike,
  ChevronDown,
  Mail,
  MapPin,
  FileText,
  Upload,
  X,
  Camera,
  XCircle,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import deliveryRiding from "@/assets/Delivery Riding.json";
import { deliveryApi } from "../services/deliveryApi";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { useDeliveryTranslation as useTranslation } from "../i18n/useDeliveryTranslation";
import { useDeliveryLanguage } from "../i18n/DeliveryLanguageProvider";
import { getLanguageMeta } from "@/shared/i18n/languages";

const VEHICLE_TYPES = [
  { value: "bike", labelKey: "dDeliveryAuth.vehicle_bike" },
  { value: "scooter", labelKey: "dDeliveryAuth.vehicle_scooter" },
  { value: "cycle", labelKey: "dDeliveryAuth.vehicle_cycle" },
];

const DeliveryAuth = () => {
  const { t } = useTranslation();
  const { language, openLanguagePicker } = useDeliveryLanguage();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";
  const logoUrl = "/Logo.png";
  const { login, user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.role === "delivery") {
      navigate("/delivery/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  // mode: "login" | "signup"
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form"); // "form" | "otp"

  // Login state
  const [loginPhone, setLoginPhone] = useState("");

  // Signup state
  const [signupStep, setSignupStep] = useState(1);
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  const [signupVehicle, setSignupVehicle] = useState("bike");
  const [signupVehicleNumber, setSignupVehicleNumber] = useState("");
  const [signupDLNumber, setSignupDLNumber] = useState("");
  const [signupPanNumber, setSignupPanNumber] = useState("");
  const [signupAadharNumber, setSignupAadharNumber] = useState("");
  const [signupAccountNumber, setSignupAccountNumber] = useState("");
  const [signupIfsc, setSignupIfsc] = useState("");
  const [signupAccountHolder, setSignupAccountHolder] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  // Document states
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [dlFile, setDlFile] = useState(null);
  const [activeUploadDoc, setActiveUploadDoc] = useState(null);

  const formatVehiclePlate = (val) => {
    let v = val.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    let formatted = '';
    if (v.length > 0) formatted += v.substring(0, 2);
    if (v.length > 2) formatted += ' ' + v.substring(2, 4);
    if (v.length > 4) formatted += ' ' + v.substring(4, 6);
    if (v.length > 6) formatted += ' ' + v.substring(6, 10);
    return formatted;
  };

  const formatDL = (val) => {
    let v = val.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    let formatted = '';
    if (v.length > 0) formatted += v.substring(0, 2);
    if (v.length > 2) formatted += '-' + v.substring(2, 4);
    if (v.length > 4) formatted += '-' + v.substring(4, 8);
    if (v.length > 8) formatted += '-' + v.substring(8, 15);
    return formatted;
  };

  // Inline phone verification state (step 1)
  const createPhoneVerifyState = () => ({
    status: "idle",      // "idle" | "sending" | "otp-sent" | "verifying" | "verified"
    otp: "",
    token: "",
    isSending: false,
    isVerifying: false,
    timer: 0,
    isOtpVisible: false,
    verifiedPhone: "",
  });
  const [phoneVerify, setPhoneVerify] = useState(createPhoneVerifyState());
  const updatePhoneVerify = (patch) =>
    setPhoneVerify((prev) => ({ ...prev, ...patch }));

  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [agreed, setAgreed] = useState(false);
  const [agreedSignup, setAgreedSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // OCR States
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [dlVerified, setDlVerified] = useState(null);
  const [panVerified, setPanVerified] = useState(null);
  const [aadharVerified, setAadharVerified] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let interval;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    if (phoneVerify.timer <= 0) return;
    const interval = setInterval(() =>
      setPhoneVerify((prev) => ({ ...prev, timer: Math.max(0, prev.timer - 1) })),
      1000,
    );
    return () => clearInterval(interval);
  }, [phoneVerify.timer]);

  const handleDLUpload = (file) => {
    setDlFile(file || null);
  };

  const handlePanUpload = (file) => {
    setPanFile(file || null);
  };

  const handleAadharUpload = (file) => {
    setAadharFile(file || null);
  };

  const handleCameraCapture = async (e, onFileCaptured) => {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
      e.preventDefault();
      try {
        const response = await window.flutter_inappwebview.callHandler("openCamera");
        if (response && response.success) {
          const byteString = atob(response.base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: response.mimeType });
          const file = new File([blob], response.fileName || "camera_image.jpg", {
            type: response.mimeType,
          });
          onFileCaptured(file);
        }
      } catch (error) {
        console.error("Camera handler error:", error);
        toast.error(t("dDeliveryAuth.failed_to_open_camera"));
      }
    }
  };

  const handleSendPhoneVerifyOtp = async () => {
    if (!signupPhone || signupPhone.length !== 10) {
      toast.error(t("dDeliveryAuth.please_enter_a_valid_10"));
      return;
    }
    updatePhoneVerify({ isSending: true, status: "sending" });
    try {
      await deliveryApi.sendPhoneVerificationOtp({ phone: signupPhone });
      updatePhoneVerify({ isSending: false, status: "otp-sent", isOtpVisible: true, otp: "", timer: 60 });
      toast.success(t("dDeliveryAuth.otp_sent_to_your_phone"));
    } catch (error) {
      updatePhoneVerify({ isSending: false, status: "idle" });
      const msg = error.response?.data?.message || t("dDeliveryAuth.failed_to_send_otp");
      const isAlreadyRegistered = msg.toLowerCase().includes("already registered");
      if (isAlreadyRegistered) {
        setErrors(prev => ({ ...prev, phone: msg }));
      } else {
        toast.error(msg);
      }
    }
  };

  const handleConfirmPhoneVerifyOtp = async () => {
    if (!/^\d{4}$/.test(phoneVerify.otp)) {
      toast.error(t("dDeliveryAuth.enter_a_valid_4_digit"));
      return;
    }
    updatePhoneVerify({ isVerifying: true });
    try {
      const res = await deliveryApi.verifyPhoneVerificationOtp({ phone: signupPhone, otp: phoneVerify.otp });
      const { verificationToken } = res.data.result || {};
      updatePhoneVerify({ isVerifying: false, status: "verified", isOtpVisible: false, otp: "", token: verificationToken, verifiedPhone: signupPhone });
      toast.success(t("dDeliveryAuth.phone_number_verified_successfully"));
    } catch (error) {
      updatePhoneVerify({ isVerifying: false });
      toast.error(error.response?.data?.message || t("dDeliveryAuth.invalid_otp"));
    }
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      if (mode === "login") {
        if (!loginPhone || loginPhone.length < 10) {
          toast.error(t("dDeliveryAuth.please_enter_a_valid_10_2"));
          return;
        }
        const res = await deliveryApi.sendLoginOtp({ phone: loginPhone });
        toast.success(res.data?.message || t("dDeliveryAuth.otp_sent"));
      } else {
        if (!signupName.trim()) { toast.error(t("dDeliveryAuth.please_enter_your_name")); return; }
        if (!signupPhone || signupPhone.length < 10) { toast.error(t("dDeliveryAuth.please_enter_a_valid_10_2")); return; }
        if (!profileImageFile) { toast.error(t("dDeliveryAuth.please_upload_your_profile_photo")); return; }

        const formData = new FormData();
        formData.append("name", signupName.trim());
        formData.append("phone", signupPhone);
        formData.append("vehicleType", signupVehicle);
        formData.append("email", signupEmail);
        formData.append("address", signupAddress);
        formData.append("vehicleNumber", signupVehicleNumber);
        formData.append("drivingLicenseNumber", signupDLNumber);
        formData.append("accountHolder", signupAccountHolder);
        formData.append("accountNumber", signupAccountNumber);
        formData.append("ifsc", signupIfsc);
        if (phoneVerify.token) formData.append("phoneVerificationToken", phoneVerify.token);

        if (profileImageFile) formData.append("profileImage", profileImageFile);
        if (aadharFile) formData.append("aadhar", aadharFile);
        if (panFile) formData.append("pan", panFile);
        if (dlFile) formData.append("dl", dlFile);

        const res = await deliveryApi.sendSignupOtp(formData);
        // If phone was pre-verified, backend returns pendingApproval directly — no OTP screen needed.
        if (res.data?.result?.pendingApproval) {
          toast.success(t("dDeliveryAuth.registration_submitted_your_application_"));
          switchMode("login");
          return;
        }
        toast.success(res.data?.message || t("dDeliveryAuth.otp_sent"));
      }
      setOtp(["", "", "", ""]);
      setTimer(60);
      setStep("otp");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || t("dDeliveryAuth.failed_to_send_otp"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.some((d) => d === "")) return;
    setLoading(true);
    try {
      const phone = mode === "login" ? loginPhone : signupPhone;
      const otpString = otp.join("");
      const response = await deliveryApi.verifyOtp({ phone, otp: otpString });
      const result = response.data.result || {};

      if (result.pendingApproval) {
        toast.success(t("dDeliveryAuth.phone_verified_your_application_is"));
        switchMode("login");
        return;
      }

      const { token, delivery } = result;
      login({ ...delivery, token, role: "delivery" });

      toast.success(t("dDeliveryAuth.welcome_redirecting_to_dashboard"));
      navigate("/delivery/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || t("dDeliveryAuth.invalid_otp"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setStep("form");
    setOtp(["", "", "", ""]);
    setLoginPhone("");
    setSignupStep(1);
    setSignupName("");
    setSignupPhone("");
    setSignupEmail("");
    setSignupAddress("");
    setSignupVehicle("bike");
    setSignupVehicleNumber("");
    setSignupDLNumber("");
    setSignupAccountNumber("");
    setSignupIfsc("");
    setSignupAccountHolder("");
    setAadharFile(null);
    setPanFile(null);
    setDlFile(null);
    setAgreed(false);
    setProfileImageFile(null);
    setProfileImagePreview("");
    setPhoneVerify(createPhoneVerifyState());
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-[#F2F7F5] flex flex-col items-center justify-center p-5 font-['Outfit',_sans-serif]">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl" />
      </div>

      <button
        type="button"
        onClick={openLanguagePicker}
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-100 bg-white text-[11px] font-bold text-[#1A4516] shadow-sm hover:bg-slate-50 transition-colors"
      >
        <Globe size={12} />
        {t("common.language")}: {getLanguageMeta(language).nativeName}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_24px_60px_rgba(26,69,22,0.08)] border border-brand-50 overflow-hidden pb-6">

          {/* Curved Green Banner */}
          <div className="relative h-[220px] bg-white overflow-hidden">
            <svg viewBox="0 0 1440 320" className="absolute top-0 left-0 w-full h-full" preserveAspectRatio="none">
              <path
                fill="#1A4516"
                d="M0,0 L1440,0 L1440,240 Q720,120 0,240 Z"
              />
            </svg>
          </div>

          {/* Logo Container (No Circle) */}
          <div className="relative -mt-28 self-center z-10 flex justify-center">
            <img src="/Logo.png" alt={t("dDeliveryAuth.logo")} className="w-44 h-44 object-contain" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${step}-title`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center mt-6 px-6"
            >
              <h1 className="text-2xl font-black text-[#1A4516] tracking-tight">
                {step === "otp"
                  ? t("dDeliveryAuth.verify_otp")
                  : mode === "login"
                    ? t("dDeliveryAuth.welcome_back")
                    : t("dDeliveryAuth.join_our_team")}
              </h1>
              <p className="text-gray-500 text-sm mt-1.5 max-w-[280px] mx-auto">
                {step === "otp"
                  ? t("dDeliveryAuth.enter_the_4_digit_code", { v1: mode === "login" ? loginPhone : signupPhone })
                  : mode === "login"
                    ? t("dDeliveryAuth.login_to_continue_your_deliveries")
                    : t("dDeliveryAuth.step_of_4", { signupStep, v2: signupStep === 1 ? t("dDeliveryAuth.step_personal") : signupStep === 2 ? t("dDeliveryAuth.step_vehicle") : signupStep === 3 ? t("dDeliveryAuth.step_bank") : t("dDeliveryAuth.step_documents") })}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form Body */}
          <div className="p-6 pt-2">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key={`form-${mode}`}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* ────────── SIGNUP MODE ────────── */}
                  {mode === "signup" && (
                    <div className="space-y-4">
                      {/* Step 1: Personal Information */}
                      {signupStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          {/* Profile Photo Capture */}
                          <div className="flex flex-col items-center justify-center py-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 self-start ml-1">{t("dDeliveryAuth.profile_photo")}</label>
                            <div className="relative group">
                              <div className="w-24 h-24 rounded-3xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-400">
                                {profileImagePreview ? (
                                  <img src={profileImagePreview} alt={t("dDeliveryAuth.preview")} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-10 h-10 text-brand-300" />
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                id="profile-upload"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProfileImageFile(file);
                                    setProfileImagePreview(URL.createObjectURL(file));
                                  }
                                }}
                              />
                              <label
                                htmlFor="profile-upload"
                                onClick={(e) => {
                                  if (window.flutter_inappwebview) {
                                    handleCameraCapture(e, (file) => {
                                      setProfileImageFile(file);
                                      setProfileImagePreview(URL.createObjectURL(file));
                                    });
                                  }
                                }}
                                className="absolute -bottom-2 -right-2 p-2.5 bg-brand-600 text-primary-foreground rounded-2xl shadow-lg shadow-brand-200 cursor-pointer hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all"
                              >
                                <Camera className="w-4 h-4" />
                              </label>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mt-3">{t("dDeliveryAuth.upload_a_clear_photo_of")}</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.full_name")}</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupName}
                                onChange={(e) => { setSignupName(e.target.value); setErrors(prev => ({...prev, name: ''})); }}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                                placeholder={t("dDeliveryAuth.enter_your_full_name")}
                              />
                            </div>
                            {errors.name ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.as_per_government_id")}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.phone_number")}</label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">+91</span>
                                <input
                                  type="tel"
                                  value={signupPhone}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setSignupPhone(val);
                                    setErrors(prev => ({...prev, phone: ''}));
                                    if (phoneVerify.status === "verified" && val !== phoneVerify.verifiedPhone) {
                                      setPhoneVerify(createPhoneVerifyState());
                                    }
                                  }}
                                  maxLength={10}
                                  disabled={phoneVerify.status === "verified"}
                                  className={`w-full pl-24 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.phone ? 'border-red-500 focus:ring-red-200' : phoneVerify.status === "verified" ? 'border-brand-300 bg-brand-50' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                                  placeholder="00000 00000"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSendPhoneVerifyOtp}
                                disabled={
                                  phoneVerify.isSending ||
                                  phoneVerify.status === "verified" ||
                                  (phoneVerify.isOtpVisible && phoneVerify.timer > 0) ||
                                  signupPhone.length !== 10
                                }
                                className={`shrink-0 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all min-w-[72px] text-center ${
                                  phoneVerify.status === "verified"
                                    ? "bg-brand-100 text-brand-700 cursor-default"
                                    : "bg-[#1A4516] text-white hover:bg-[#133A10] disabled:opacity-40 disabled:cursor-not-allowed"
                                }`}
                              >
                                {phoneVerify.isSending ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                ) : phoneVerify.status === "verified" ? (
                                  t("dDeliveryAuth.done")
                                ) : phoneVerify.isOtpVisible && phoneVerify.timer > 0 ? (
                                  `${phoneVerify.timer}s`
                                ) : phoneVerify.isOtpVisible ? (
                                  t("dDeliveryAuth.resend")
                                ) : (
                                  t("dDeliveryAuth.verify")
                                )}
                              </button>
                            </div>
                            {errors.phone ? (
                              <div className="ml-1">
                                <p className="text-[10px] text-red-500 font-bold">{errors.phone}</p>
                                {errors.phone.toLowerCase().includes("already registered") && (
                                  <button
                                    type="button"
                                    onClick={() => switchMode("login")}
                                    className="text-[10px] text-brand-600 font-black underline mt-0.5"
                                  >
                                   {t("dDeliveryAuth.sign_in_instead")}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.10_digit_mobile_number")}</p>
                            )}

                            {/* Inline OTP input */}
                            {phoneVerify.isOtpVisible && phoneVerify.status !== "verified" && (
                              <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 mt-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder={t("dDeliveryAuth.enter_4_digit_otp")}
                                  value={phoneVerify.otp}
                                  onChange={(e) => updatePhoneVerify({ otp: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                                  className="flex-1 bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
                                />
                                <button
                                  type="button"
                                  onClick={handleConfirmPhoneVerifyOtp}
                                  disabled={phoneVerify.isVerifying || phoneVerify.otp.length !== 4}
                                  className="px-3 py-1.5 bg-[#1A4516] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#133A10] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                  {phoneVerify.isVerifying ? t("dDeliveryAuth.checking") : t("dDeliveryAuth.confirm_otp")}
                                </button>
                              </div>
                            )}
                            {phoneVerify.status === "verified" && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 px-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{t("dDeliveryAuth.phone_number_verified_successfully_2")}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.email_address")}</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="email"
                                value={signupEmail}
                                onChange={(e) => { setSignupEmail(e.target.value); setErrors(prev => ({...prev, email: ''})); }}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                                placeholder={t("dDeliveryAuth.example_gmail_com")}
                              />
                            </div>
                            {errors.email ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.used_for_important_updates_and")}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.permanent_address")}</label>
                            <div className="relative">
                              <MapPin className="absolute left-4 top-4 text-gray-300 w-4 h-4" />
                              <textarea
                                value={signupAddress}
                                onChange={(e) => { setSignupAddress(e.target.value); setErrors(prev => ({...prev, address: ''})); }}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all resize-none h-24 ${errors.address ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                                placeholder={t("dDeliveryAuth.complete_building_address")}
                              />
                            </div>
                            {errors.address ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.address}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.include_flat_number_street_and")}</p>}
                          </div>

                          <button
                            onClick={() => {
                              const newErrors = {};
                              if (!profileImageFile) {
                                toast.error(t("dDeliveryAuth.please_upload_your_profile_photo"));
                                return;
                              }
                              if (!signupName || signupName.trim().length < 3) newErrors.name = t("dDeliveryAuth.minimum_3_characters_required");
                              if (!signupPhone || signupPhone.length !== 10) newErrors.phone = t("dDeliveryAuth.must_be_exactly_10_digits");
                              if (signupPhone.length === 10 && phoneVerify.status !== "verified") {
                                toast.error(t("dDeliveryAuth.please_verify_your_phone_number"));
                                return;
                              }
                              if (!signupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) newErrors.email = t("dDeliveryAuth.invalid_email_address");
                              if (!signupAddress || signupAddress.trim().length < 10) newErrors.address = t("dDeliveryAuth.please_enter_a_detailed_address");

                              if (Object.keys(newErrors).length > 0) {
                                setErrors(newErrors);
                                return;
                              }
                              setSignupStep(2);
                            }}
                            disabled={signupPhone.length === 10 && phoneVerify.status !== "verified"}
                            className="w-full py-4 bg-brand-600 text-primary-foreground rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                          >
                           {t("dDeliveryAuth.next_step")} <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}

                      {/* Step 2: Vehicle Information */}
                      {signupStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.vehicle_type")}</label>
                            <div className="relative">
                              <Bike className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <button
                                type="button"
                                onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                                className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none text-left"
                              >
                                {t(VEHICLE_TYPES.find((v) => v.value === signupVehicle)?.labelKey || "dDeliveryAuth.vehicle_bike")}
                              </button>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <AnimatePresence>
                                {showVehicleDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-lg mt-2 overflow-hidden z-20"
                                  >
                                    {VEHICLE_TYPES.map((v) => (
                                      <button
                                        key={v.value}
                                        onClick={() => { setSignupVehicle(v.value); setShowVehicleDropdown(false); }}
                                        className="w-full px-4 py-3 text-sm font-bold text-left hover:bg-brand-50 transition-colors"
                                      >
                                        {t(v.labelKey)}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.vehicle_plate_number")}</label>
                            <div className="relative">
                              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupVehicleNumber}
                                onChange={(e) => { setSignupVehicleNumber(e.target.value.toUpperCase()); setErrors(prev => ({...prev, vehicleNumber: ''})); }}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                                placeholder={t("dDeliveryAuth.e_g_mh_02_ab")}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.e_g_mh_01_ab")}</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.driving_license_number")}</label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupDLNumber}
                                onChange={(e) => { setSignupDLNumber(formatDL(e.target.value)); setErrors(prev => ({...prev, dlNumber: ''})); }}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.dlNumber ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                                placeholder={t("dDeliveryAuth.dl_1420110012345")}
                              />
                            </div>
                            {errors.dlNumber ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.dlNumber}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.10_to_20_character_driving")}</p>}
                          </div>

                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(1)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                             {t("dDeliveryAuth.back")}
                            </button>
                            <button
                              onClick={() => {
                                const newErrors = {};
                                if (!signupDLNumber || !/^[A-Z]{2}-[0-9]{2}-[0-9]{4}-[0-9]{6,7}$/.test(signupDLNumber)) {
                                  newErrors.dlNumber = t("dDeliveryAuth.invalid_dl_format_expected_ss");
                                }
                                
                                if (Object.keys(newErrors).length > 0) {
                                  setErrors(newErrors);
                                  return;
                                }
                                setSignupStep(3);
                              }}
                              className="flex-[2] py-4 bg-brand-600 text-primary-foreground rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                            >
                             {t("dDeliveryAuth.next_step")} <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Bank Information */}
                      {signupStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.aadhar_number")}</label>
                            <input
                              type="text"
                              value={signupAadharNumber}
                              onChange={(e) => { setSignupAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12)); setErrors(prev => ({...prev, aadhar: ''})); }}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all font-mono ${errors.aadhar ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                              placeholder="0000 0000 0000"
                            />
                            {errors.aadhar ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.aadhar}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.12_digit_unique_identification_number")}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.pan_card_number")}</label>
                            <input
                              type="text"
                              value={signupPanNumber}
                              onChange={(e) => { setSignupPanNumber(e.target.value.toUpperCase().slice(0, 10)); setErrors(prev => ({...prev, pan: ''})); }}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all font-mono ${errors.pan ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                              placeholder={t("dDeliveryAuth.abcde1234f")}
                            />
                            {errors.pan ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.pan}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.10_character_alphanumeric_e_g")}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.account_holder_name")}</label>
                            <input
                              type="text"
                              value={signupAccountHolder}
                              onChange={(e) => { setSignupAccountHolder(e.target.value.toUpperCase()); setErrors(prev => ({...prev, accountName: ''})); }}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.accountName ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                              placeholder={t("dDeliveryAuth.as_per_bank_records")}
                            />
                            {errors.accountName ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.accountName}</p> : null}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.account_number")}</label>
                            <input
                              type="text"
                              value={signupAccountNumber}
                              onChange={(e) => { setSignupAccountNumber(e.target.value.replace(/\D/g, "")); setErrors(prev => ({...prev, accountNumber: ''})); }}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.accountNumber ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                              placeholder="000000000000"
                            />
                            {errors.accountNumber ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.accountNumber}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.9_18_digit_account_number")}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-brand-700 uppercase tracking-widest ml-1">{t("dDeliveryAuth.ifsc_code")}</label>
                              <input
                                type="text"
                                value={signupIfsc}
                                onChange={(e) => { setSignupIfsc(e.target.value.toUpperCase().slice(0, 11)); setErrors(prev => ({...prev, ifsc: ''})); }}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:outline-none transition-all ${errors.ifsc ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'}`}
                              placeholder={t("dDeliveryAuth.hdfc0001234")}
                            />
                            {errors.ifsc ? <p className="text-[10px] text-red-500 font-bold ml-1">{errors.ifsc}</p> : <p className="text-[10px] text-gray-400 font-semibold ml-1">{t("dDeliveryAuth.11_character_bank_ifsc_e")}</p>}
                          </div>

                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(2)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                             {t("dDeliveryAuth.back")}
                            </button>
                            <button
                              onClick={() => {
                                const newErrors = {};
                                if (!signupAadharNumber || !/^\d{12}$/.test(signupAadharNumber)) {
                                  newErrors.aadhar = t("dDeliveryAuth.aadhar_number_must_be_exactly");
                                }
                                if (!signupPanNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(signupPanNumber)) {
                                  newErrors.pan = t("dDeliveryAuth.invalid_pan_number_format");
                                }
                                if (!signupAccountHolder || signupAccountHolder.trim().length < 3) {
                                  newErrors.accountName = t("dDeliveryAuth.invalid_account_holder_name");
                                }
                                if (!signupAccountNumber || !/^\d{9,18}$/.test(signupAccountNumber)) {
                                  newErrors.accountNumber = t("dDeliveryAuth.invalid_account_number_length");
                                }
                                if (!signupIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(signupIfsc)) {
                                  newErrors.ifsc = t("dDeliveryAuth.invalid_ifsc_code");
                                }
                                
                                if (Object.keys(newErrors).length > 0) {
                                  setErrors(newErrors);
                                  return;
                                }
                                setSignupStep(4);
                              }}
                              className="flex-[2] py-4 bg-brand-600 text-primary-foreground rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                            >
                             {t("dDeliveryAuth.next_step")} <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4: Documents Upload */}
                      {signupStep === 4 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-3">
                            {[
                              { label: t("dDeliveryAuth.aadhar_card_front_back"), state: aadharFile, setter: setAadharFile, id: "aadhar" },
                              { label: t("dDeliveryAuth.pan_card"), state: panFile, setter: setPanFile, id: "pan" },
                              { label: t("dDeliveryAuth.driving_license"), state: dlFile, setter: setDlFile, id: "dl" },
                            ].map((doc) => (
                              <div key={doc.id} className="relative">
                                <input
                                  type="file"
                                  id={`camera-${doc.id}`}
                                  className="hidden"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (doc.id === "dl") handleDLUpload(file);
                                    else if (doc.id === "pan") handlePanUpload(file);
                                    else if (doc.id === "aadhar") handleAadharUpload(file);
                                    else doc.setter(file);
                                  }}
                                />
                                <input
                                  type="file"
                                  id={`gallery-${doc.id}`}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (doc.id === "dl") handleDLUpload(file);
                                    else if (doc.id === "pan") handlePanUpload(file);
                                    else if (doc.id === "aadhar") handleAadharUpload(file);
                                    else doc.setter(file);
                                  }}
                                />
                                <input
                                  type="file"
                                  id={`pdf-${doc.id}`}
                                  className="hidden"
                                  accept="application/pdf,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (doc.id === "dl") handleDLUpload(file);
                                    else if (doc.id === "pan") handlePanUpload(file);
                                    else if (doc.id === "aadhar") handleAadharUpload(file);
                                    else doc.setter(file);
                                  }}
                                />
                                <div
                                  onClick={() => setActiveUploadDoc(doc.id)}
                                  className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${doc.state
                                    ? "border-brand-200 bg-brand-50/50"
                                    : "border-gray-100 bg-gray-50 hover:border-brand-200 hover:bg-brand-50/30"
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${doc.state ? "bg-brand-100 text-brand-600" : "bg-white text-gray-400 shadow-sm"}`}>
                                      {doc.state ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                    </div>
                                    <div className="text-left">
                                      <p className={`text-xs font-black uppercase tracking-tight ${doc.state ? "text-brand-700" : "text-gray-500"}`}>
                                        {doc.label}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-bold truncate max-w-[180px]">
                                        {doc.state ? doc.state.name : t("dDeliveryAuth.tap_to_upload_document")}
                                      </p>
                                    </div>
                                  </div>
                                  {doc.state && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        doc.setter(null);
                                      }}
                                      className="p-1.5 hover:bg-brand-100 rounded-lg text-brand-600 transition-colors z-10"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 italic px-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 text-brand-300" />
                             {t("dDeliveryAuth.documents_will_be_verified_by")}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setSignupStep(3)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                             {t("dDeliveryAuth.back")}
                            </button>
                            <button
                              onClick={handleSendOtp}
                              disabled={loading || !dlFile || !panFile || !aadharFile || !agreedSignup}
                              className="flex-[2] py-4 bg-brand-600 text-primary-foreground rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                 {t("dDeliveryAuth.register")} <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {signupStep === 4 ? (
                        <div className="flex items-start gap-2.5 px-1 py-2 mt-4">
                          <input
                            type="checkbox"
                            id="agreeSignup"
                            checked={agreedSignup}
                            onChange={(e) => setAgreedSignup(e.target.checked)}
                            className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <label htmlFor="agreeSignup" className="text-[10px] text-gray-500 font-medium leading-tight cursor-pointer">
                           {t("dDeliveryAuth.i_have_read_and_agree")}{" "}
                            <span onClick={(e) => { e.preventDefault(); navigate('/delivery/support'); }} className="text-brand-600 font-bold hover:underline">{t("dDeliveryAuth.support")}</span>
                            {" "}&amp;{" "}
                            <span onClick={(e) => { e.preventDefault(); navigate('/delivery/privacy'); }} className="text-brand-600 font-bold hover:underline">{t("dDeliveryAuth.privacy_policy")}</span>
                            .
                          </label>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-gray-400 font-semibold pt-1">
                         {t("dDeliveryAuth.by_joining_you_agree_to")}{" "}
                          <span onClick={() => navigate('/delivery/support')} className="text-brand-500 font-bold cursor-pointer hover:underline">{t("dDeliveryAuth.support")}</span>{" "}
                          &amp;{" "}
                          <span onClick={() => navigate('/delivery/privacy')} className="text-brand-500 font-bold cursor-pointer hover:underline">{t("dDeliveryAuth.privacy_policy")}</span>
                        </p>
                      )}

                      <p className="text-center text-sm text-gray-500 mt-3 font-medium">
                       {t("dDeliveryAuth.already_have_an_account")}{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("login")}
                          className="text-[#1A4516] font-bold hover:underline"
                        >
                         {t("dDeliveryAuth.sign_in")}
                        </button>
                      </p>
                    </div>
                  )}

                  {/* ────────── LOGIN MODE ────────── */}
                  {mode === "login" && (
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#1A4516] uppercase tracking-widest ml-1">
                         {t("dDeliveryAuth.phone_number")}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={loginPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setLoginPhone(val);
                            }}
                            maxLength={10}
                            className="w-full pl-24 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-[#1A4516] transition-all placeholder:text-gray-300"
                            placeholder="98765 43210"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full py-4 bg-[#1A4516] text-white rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-[#0f2d0f] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>{t("dDeliveryAuth.login")} <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>

                      <p className="text-center text-sm text-gray-500 mt-6 font-medium">
                       {t("dDeliveryAuth.don_t_have_an_account")}{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("signup")}
                          className="text-[#1A4516] font-bold hover:underline"
                        >
                         {t("dDeliveryAuth.register")}
                        </button>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── OTP STEP ─── */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  {/* OTP Boxes */}
                  <div className="space-y-2 text-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                     {t("dDeliveryAuth.enter_security_code")}
                    </label>
                    <div className="flex justify-center gap-3 pt-1">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="tel"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className="w-14 h-14 text-center text-2xl font-black border-2 border-gray-100 rounded-2xl focus:border-[#1A4516] focus:ring-4 focus:ring-green-100 outline-none transition-all bg-gray-50 text-gray-900"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Timer / Resend */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-gray-400 text-sm font-medium">
                       {t("dDeliveryAuth.resend_code_in")} <span className="text-[#1A4516] font-bold">{timer}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        className="text-[#1A4516] font-black text-sm uppercase tracking-wide hover:underline"
                      >
                       {t("dDeliveryAuth.resend_otp")}
                      </button>
                    )}
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otp.some((d) => !d) || loading}
                    className="w-full py-4 bg-[#1A4516] text-white rounded-2xl text-sm font-semibold tracking-widest uppercase shadow-lg shadow-brand-200 hover:bg-[#0f2d0f] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>{t("dDeliveryAuth.verify_login")} <CheckCircle className="w-4 h-4" /></>
                    )}
                  </button>

                  {/* Back */}
                  <button
                    onClick={() => { setStep("form"); setOtp(["", "", "", ""]); }}
                    className="w-full flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> {t("dDeliveryAuth.edit_phone_number")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3 opacity-40">
          <span className="h-px w-8 bg-gray-400" />
          <ShieldCheck className="text-gray-500 w-4 h-4" />
          <span className="h-px w-8 bg-gray-400" />
        </div>
        <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[4px] mt-2">
          {t("dDeliveryAuth.partner_ecosystem_v1_0", { appName })}</p>
      </motion.div>

      {/* Action Sheet for Document Upload */}
      <AnimatePresence>
        {activeUploadDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveUploadDoc(null)}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl shadow-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] flex flex-col gap-3 max-w-[420px] mx-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-black text-gray-800 text-center uppercase tracking-wider mb-2">
               {t("dDeliveryAuth.upload_document")}
              </h3>
              
              <button
                type="button"
                onClick={(e) => {
                  if (window.flutter_inappwebview) {
                    handleCameraCapture(e, (file) => {
                      if (activeUploadDoc === "dl") handleDLUpload(file);
                      else if (activeUploadDoc === "pan") handlePanUpload(file);
                      else if (activeUploadDoc === "aadhar") handleAadharUpload(file);
                      setActiveUploadDoc(null);
                    });
                  } else {
                    document.getElementById(`camera-${activeUploadDoc}`).click();
                    setActiveUploadDoc(null);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 rounded-xl font-bold transition-colors border border-gray-100"
              >
                <Camera className="w-5 h-5" /> {t("dDeliveryAuth.open_camera")}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  document.getElementById(`gallery-${activeUploadDoc}`).click();
                  setActiveUploadDoc(null);
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 rounded-xl font-bold transition-colors border border-gray-100"
              >
                <ImageIcon className="w-5 h-5" /> {t("dDeliveryAuth.choose_from_gallery")}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  document.getElementById(`pdf-${activeUploadDoc}`).click();
                  setActiveUploadDoc(null);
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 rounded-xl font-bold transition-colors border border-gray-100"
              >
                <FileText className="w-5 h-5" /> {t("dDeliveryAuth.upload_pdf_file")}
              </button>
              
              <button
                type="button"
                onClick={() => setActiveUploadDoc(null)}
                className="w-full mt-2 py-3 text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider text-xs"
              >
               {t("dDeliveryAuth.cancel")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryAuth;
