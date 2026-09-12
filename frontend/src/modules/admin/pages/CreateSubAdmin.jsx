import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Shield,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { adminSubAdminApi } from "../services/api/subAdminApi";
import { ADMIN_SECTIONS } from "@core/context/PermissionContext";

const STEPS = [
  { key: "email", label: "Enter Email", icon: Mail },
  { key: "otp", label: "Verify Email", icon: ShieldCheck },
  { key: "details", label: "Set Details", icon: User },
  { key: "permissions", label: "Assign Permissions", icon: Shield },
];

const CreateSubAdmin = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState({});

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    try {
      setIsLoading(true);
      const res = await adminSubAdminApi.sendInviteOtp({ email: email.trim().toLowerCase() });
      const data = res.data.result || res.data;
      if (data.mockOtp) {
        toast.info(`Mock OTP: ${data.mockOtp}`, { duration: 10000 });
      }
      toast.success("Verification OTP sent to email");
      setCurrentStep(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    try {
      setIsLoading(true);
      await adminSubAdminApi.verifyEmail({ email, otp });
      toast.success("Email verified successfully!");
      setCurrentStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Validate details
  const handleDetailsNext = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    const pwd = password.trim();
    if (pwd.length < 10) {
      toast.error("Password must be at least 10 characters");
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      toast.error("Password must contain a lowercase letter");
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      toast.error("Password must contain an uppercase letter");
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      toast.error("Password must contain a number");
      return;
    }
    setCurrentStep(3);
  };

  // Toggle permission
  const togglePermission = (section, action) => {
    setPermissions((prev) => {
      const current = prev[section] || [];
      if (current.includes(action)) {
        const updated = current.filter((a) => a !== action);
        if (updated.length === 0) {
          const { [section]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [section]: updated };
      }
      return { ...prev, [section]: [...current, action] };
    });
  };

  // Toggle all actions for a section
  const toggleSection = (section) => {
    const sectionConfig = ADMIN_SECTIONS[section];
    const current = permissions[section] || [];
    if (current.length === sectionConfig.actions.length) {
      const { [section]: _, ...rest } = permissions;
      setPermissions(rest);
    } else {
      setPermissions({ ...permissions, [section]: [...sectionConfig.actions] });
    }
  };

  // Select/deselect all sections
  const toggleAll = () => {
    const allSections = Object.keys(ADMIN_SECTIONS).filter((s) => s !== "sub_admins");
    const allSelected = allSections.every(
      (s) => (permissions[s] || []).length === ADMIN_SECTIONS[s].actions.length
    );
    if (allSelected) {
      setPermissions({});
    } else {
      const all = {};
      allSections.forEach((s) => {
        all[s] = [...ADMIN_SECTIONS[s].actions];
      });
      setPermissions(all);
    }
  };

  // Step 4: Create Sub Admin
  const handleCreate = async () => {
    if (Object.keys(permissions).length === 0) {
      toast.error("Please assign at least one permission");
      return;
    }
    try {
      setIsLoading(true);
      await adminSubAdminApi.create({
        email,
        name: name.trim(),
        password,
        permissions,
      });
      toast.success("Sub Admin created successfully!");
      navigate("/admin/sub-admins");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create Sub Admin");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (() => {
    const pwd = password.trim();
    let score = 0;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"][passwordStrength];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/sub-admins")}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create Sub Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isComplete = i < currentStep;

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#0B3B24] text-white"
                    : isComplete
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-50 text-slate-400"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Icon size={14} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded ${
                    isComplete ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {currentStep === 0 && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Enter Sub Admin Email</h2>
                <p className="text-sm text-slate-500">
                  We'll send a verification code to this email address.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0B3B24] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="subadmin@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-[#0B3B24]/20 focus:ring-2 focus:ring-[#0B3B24]/10 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={isLoading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0B3B24] text-white rounded-lg text-sm font-bold hover:bg-[#0a3320] disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 1 && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Verify Email</h2>
                <p className="text-sm text-slate-500">
                  Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Verification Code
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0B3B24] transition-colors" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700 tracking-[0.3em] text-center focus:outline-none focus:bg-white focus:border-[#0B3B24]/20 focus:ring-2 focus:ring-[#0B3B24]/10 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setOtp("");
                  }}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0B3B24] text-white rounded-lg text-sm font-bold hover:bg-[#0a3320] disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full text-sm text-[#0B3B24] font-semibold hover:underline disabled:opacity-50"
              >
                Resend Code
              </button>
            </motion.div>
          )}

          {/* Step 3: Name & Password */}
          {currentStep === 2 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Set Account Details</h2>
                <p className="text-sm text-slate-500">
                  Set the name and password for the Sub Admin account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0B3B24] transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-[#0B3B24]/20 focus:ring-2 focus:ring-[#0B3B24]/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0B3B24] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 10 chars, upper + lower + number"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-[#0B3B24]/20 focus:ring-2 focus:ring-[#0B3B24]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 h-1.5 rounded-full transition-colors ${
                            passwordStrength >= level ? strengthColor : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{strengthLabel}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleDetailsNext}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0B3B24] text-white rounded-lg text-sm font-bold hover:bg-[#0a3320] transition-all"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Permissions */}
          {currentStep === 3 && (
            <motion.div
              key="permissions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-1">
                    Assign Permissions
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select which sections and actions this Sub Admin can access.
                  </p>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-xs font-semibold text-[#0B3B24] hover:underline flex-shrink-0"
                >
                  {Object.keys(ADMIN_SECTIONS)
                    .filter((s) => s !== "sub_admins")
                    .every(
                      (s) =>
                        (permissions[s] || []).length === ADMIN_SECTIONS[s].actions.length
                    )
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(ADMIN_SECTIONS)
                  .filter(([key]) => key !== "sub_admins")
                  .map(([section, config]) => {
                    const sectionPerms = permissions[section] || [];
                    const allSelected = sectionPerms.length === config.actions.length;

                    return (
                      <div
                        key={section}
                        className="border border-slate-100 rounded-lg p-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleSection(section)}
                              className="w-4 h-4 rounded border-slate-300 text-[#0B3B24] focus:ring-[#0B3B24]/20"
                            />
                            <span className="text-sm font-semibold text-slate-700">
                              {config.label}
                            </span>
                          </label>
                          {sectionPerms.length > 0 && (
                            <span className="text-xs text-slate-400 font-medium">
                              {sectionPerms.length}/{config.actions.length}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {config.actions.map((action) => {
                            const isChecked = sectionPerms.includes(action);
                            return (
                              <button
                                key={action}
                                onClick={() => togglePermission(section, action)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                  isChecked
                                    ? "bg-[#0B3B24] text-white border-[#0B3B24]"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {isChecked && <Check size={12} />}
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isLoading || Object.keys(permissions).length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0B3B24] text-white rounded-lg text-sm font-bold hover:bg-[#0a3320] disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Create Sub Admin
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreateSubAdmin;
