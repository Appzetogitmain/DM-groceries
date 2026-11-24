import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark, CreditCard, AlertTriangle, CheckCircle2, User } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import Input from "@/shared/components/ui/Input";
import { deliveryApi } from "../../services/deliveryApi";
import { toast } from "sonner";
import { useDeliveryTranslation as useTranslation } from "../../i18n/useDeliveryTranslation";
import { translateLabel } from "../../i18n/format";

const BankAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [bankDetails, setBankDetails] = useState({
    accountHolder: "N/A",
    accountNumber: "N/A",
    ifsc: "N/A",
    bankName: "Verified Bank",
    branch: "N/A",
    status: "Active",
  });

  const [formData, setFormData] = useState({
    accountHolder: "",
    newAccount: "",
    confirmAccount: "",
    ifscCode: ""
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await deliveryApi.getProfile();
      if (res.data.success && res.data.result) {
        const { accountHolder, accountNumber, ifsc, name } = res.data.result;
        setBankDetails({
          accountHolder: accountHolder || name || "N/A",
          accountNumber: accountNumber || "N/A",
          ifsc: ifsc || "N/A",
          bankName: "Verified Bank",
          branch: "India",
          status: accountNumber ? "Active" : "Pending",
        });
      }
    } catch (error) {
      toast.error(t("dBankAccount.failed_to_load_bank_details"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "accountHolder") {
      formattedValue = value.toUpperCase();
    } else if (name === "newAccount" || name === "confirmAccount") {
      formattedValue = value.replace(/\D/g, "");
    } else if (name === "ifscCode") {
      formattedValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    setFormData({
      ...formData,
      [name]: formattedValue
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.accountHolder || !formData.newAccount || !formData.confirmAccount || !formData.ifscCode) {
      return toast.error(t("dBankAccount.please_fill_all_fields"));
    }
    if (formData.newAccount !== formData.confirmAccount) {
      return toast.error(t("dBankAccount.account_numbers_do_not_match"));
    }

    try {
      setIsUpdating(true);
      const response = await deliveryApi.updateProfile({
        accountHolder: formData.accountHolder,
        accountNumber: formData.newAccount,
        ifsc: formData.ifscCode
      });
      if (response.data.success) {
        toast.success(t("dBankAccount.bank_details_updated_successfully"));
        setFormData({ accountHolder: "", newAccount: "", confirmAccount: "", ifscCode: "" });
        fetchProfile();
      }
    } catch (error) {
      toast.error(t("dBankAccount.failed_to_update_bank_details"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-28 relative font-sans">
      
      {/* Sticky Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white py-3 px-5 sticky top-0 z-40 shadow-sm flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
          aria-label={t("dBankAccount.go_back")}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-sm font-black leading-tight tracking-tight">{t("dBankAccount.bank_account")}</h1>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-lg mx-auto space-y-4 relative z-10">
        
        {/* Bank Card Visual */}
        <div className="bg-gradient-to-br from-[#1A4516] to-[#123610] text-white p-4.5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-center mb-5 relative z-10">
            <Landmark size={24} className="text-white/80" />
            <span className={`${bankDetails.status === "Active" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"} px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border flex items-center`}>
              {bankDetails.status === "Active" && <CheckCircle2 size={10} className="mr-0.5" />} {translateLabel(t, bankDetails.status)}
            </span>
          </div>

          <div className="space-y-0.5 relative z-10">
            <p className="text-white/60 text-[9px] uppercase tracking-wider font-bold">{t("dBankAccount.account_number")}</p>
            <p className="font-mono text-xl tracking-widest font-bold">{bankDetails.accountNumber}</p>
          </div>

          <div className="flex justify-between items-end mt-5 relative z-10">
            <div>
              <p className="text-white/60 text-[9px] uppercase tracking-wider mb-0.5 font-bold">{t("dBankAccount.account_holder")}</p>
              <p className="font-extrabold text-sm">{bankDetails.accountHolder}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[10px] font-mono mt-0.5">{bankDetails.ifsc}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-100/50 p-3 rounded-xl flex items-start">
          <AlertTriangle size={16} className="text-amber-600 mr-2.5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-800 font-extrabold text-xs mb-0.5">{t("dBankAccount.payment_information")}</h4>
            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
             {t("dBankAccount.your_weekly_earnings_will_be")}
            </p>
          </div>
        </div>

        {/* Change Request Form */}
        <div className="pt-2">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 px-1">{t("dBankAccount.request_change")}</h3>
          <form className="space-y-3" onSubmit={handleUpdate}>
            <Input 
              name="accountHolder"
              value={formData.accountHolder}
              onChange={handleChange}
              label={t("dBankAccount.account_holder_name")} 
              placeholder={t("dBankAccount.enter_account_holder_name")} 
              icon={User}
              className="focus:ring-[#1A4516]/10 focus:border-[#1A4516]"
            />
            <Input 
              name="newAccount"
              value={formData.newAccount}
              onChange={handleChange}
              label={t("dBankAccount.new_account_number")} 
              placeholder={t("dBankAccount.enter_account_number")} 
              icon={CreditCard}
              className="focus:ring-[#1A4516]/10 focus:border-[#1A4516]"
            />
            <Input 
              name="confirmAccount"
              value={formData.confirmAccount}
              onChange={handleChange}
              label={t("dBankAccount.confirm_account_number")} 
              placeholder={t("dBankAccount.re_enter_account_number")} 
              icon={CreditCard}
              className="focus:ring-[#1A4516]/10 focus:border-[#1A4516]"
            />
            <Input 
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              label={t("dBankAccount.ifsc_code")} 
              placeholder={t("dBankAccount.enter_ifsc_code")} 
              icon={Landmark}
              className="focus:ring-[#1A4516]/10 focus:border-[#1A4516]"
            />
            <Button 
              type="submit" 
              disabled={isUpdating}
              className="w-full mt-2 bg-[#1A4516] hover:bg-[#153b12] text-white border-none py-2 text-xs font-bold rounded-xl flex items-center justify-center" 
              variant="outline"
            >
              {isUpdating ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : t("dBankAccount.verify_update")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BankAccount;
