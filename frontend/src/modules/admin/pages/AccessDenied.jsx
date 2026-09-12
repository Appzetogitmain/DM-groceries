import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8"
    >
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <ShieldX className="w-10 h-10 text-red-400" />
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Access Denied
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-8">
        You don't have permission to access this section.
        Contact your Super Admin to request access.
      </p>

      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-2 px-6 py-2.5 bg-[#0B3B24] text-white rounded-lg text-sm font-semibold hover:bg-[#0a3320] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </motion.div>
  );
};

export default AccessDenied;
