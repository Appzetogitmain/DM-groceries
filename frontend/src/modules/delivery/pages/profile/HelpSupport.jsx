import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@core/context/SettingsContext";
import { useDeliveryTranslation as useTranslation } from "../../i18n/useDeliveryTranslation";

const HelpSupport = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const faqs = [
    {
      question: t("dHelpSupport.how_do_i_change_my"),
      answer:
        t("dHelpSupport.go_to_profile_bank_account"),
    },
    {
      question: t("dHelpSupport.what_if_i_can_t"),
      answer:
        t("dHelpSupport.use_the_in_app_map"),
    },
    {
      question: t("dHelpSupport.how_are_my_earnings_calculated"),
      answer:
        t("dHelpSupport.earnings_are_based_on_base"),
    },
    {
      question: t("dHelpSupport.i_had_an_accident_during"),
      answer:
        t("dHelpSupport.use_the_sos_button_immediately"),
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const { settings } = useSettings();
  const supportPhone = settings?.supportPhone || '9992507555';
  const supportPhoneUrl = supportPhone.replace(/[^0-9+]/g, '');

  return (
    <div className="bg-white min-h-screen pb-28 relative font-sans">
      
      {/* Sticky Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white py-3 px-5 sticky top-0 z-40 shadow-sm flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
          aria-label={t("dHelpSupport.go_back")}
        >
          <ArrowLeft className="text-white" size={18} />
        </button>
        <h1 className="text-sm font-black leading-tight tracking-tight">{t("dHelpSupport.help_support")}</h1>
      </div>

      {/* Main Content Area overlapping with rounded corners */}
      <div className="bg-white rounded-t-[32px] -mt-5 pt-10 px-4 space-y-4.5 relative z-10">
        
        <section className="grid grid-cols-2 gap-3.5 mt-5">
          <Card 
            className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/delivery/profile/chat-support')}
          >
            <div className="w-10 h-10 bg-[#1A4516]/5 rounded-full flex items-center justify-center text-[#1A4516] mb-2 shrink-0">
              <MessageCircle size={18} />
            </div>
            <h4 className="font-bold text-gray-800 text-xs">{t("dHelpSupport.chat_support")}</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">{t("dHelpSupport.wait_time_2_mins")}</p>
          </Card>
          <Card 
            className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.href = `tel:+91${supportPhoneUrl}`}
          >
            <div className="w-10 h-10 bg-[#1A4516]/5 rounded-full flex items-center justify-center text-[#1A4516] mb-2 shrink-0">
              <Phone size={18} />
            </div>
            <h4 className="font-bold text-gray-800 text-xs">{t("dHelpSupport.call_support")}</h4>
            <p className="text-[10px] text-gray-400 mt-0.5 font-bold tracking-wide">{supportPhone}</p>
          </Card>
        </section>

        {/* FAQs */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center px-1">
            <HelpCircle size={14} className="mr-1.5 text-[#1A4516]" /> {t("dHelpSupport.frequently_asked_questions")}
          </h2>
          <div className="space-y-2.5">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="overflow-hidden cursor-pointer bg-white border border-gray-100 rounded-xl shadow-sm"
                onClick={() => toggleAccordion(index)}>
                <div className="p-3 flex justify-between items-center bg-white">
                  <h4 className="font-semibold text-gray-800 text-xs pr-3">
                    {faq.question}
                  </h4>
                  {openIndex === index ? (
                    <ChevronUp size={14} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400 shrink-0" />
                  )}
                </div>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-gray-50/50">
                      <div className="p-3 text-[11px] text-gray-500 border-t border-gray-100/50 leading-relaxed font-medium">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </section>


      </div>
    </div>
  );
};

export default HelpSupport;
