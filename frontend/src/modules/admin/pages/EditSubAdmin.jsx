import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Check,
  Save,
  Loader2,
  User,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { adminSubAdminApi } from "../services/api/subAdminApi";
import { ADMIN_SECTIONS } from "@core/context/PermissionContext";

const EditSubAdmin = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [subAdmin, setSubAdmin] = useState(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState({});

  const fetchSubAdmin = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminSubAdminApi.getById(id);
      const data = res.data.result;
      setSubAdmin(data);
      setName(data.name || "");
      setPermissions(data.permissions || {});
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load Sub Admin");
      navigate("/admin/sub-admins");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchSubAdmin();
  }, [fetchSubAdmin]);

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

  const handleSave = async () => {
    if (Object.keys(permissions).length === 0) {
      toast.error("At least one permission must be assigned");
      return;
    }
    try {
      setIsSaving(true);
      const updates = {};
      if (name.trim() !== subAdmin.name) {
        updates.name = name.trim();
      }
      updates.permissions = permissions;

      await adminSubAdminApi.update(id, updates);
      toast.success("Sub Admin updated successfully");
      navigate("/admin/sub-admins");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update Sub Admin");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!subAdmin) return null;

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
          <h1 className="text-2xl font-bold text-slate-800">Edit Sub Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Update name and permissions
          </p>
        </div>
      </div>

      {/* Sub Admin Info Card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#0B3B24]/10 flex items-center justify-center">
            <span className="text-lg font-bold text-[#0B3B24]">
              {subAdmin.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600">{subAdmin.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  subAdmin.isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    subAdmin.isActive ? "bg-emerald-500" : "bg-red-400"
                  }`}
                />
                {subAdmin.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Name Edit */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Full Name
          </label>
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#0B3B24] transition-colors" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-[#0B3B24]/20 focus:ring-2 focus:ring-[#0B3B24]/10 transition-all"
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield size={16} className="text-[#0B3B24]" />
              Permissions
            </h3>
            <button
              onClick={toggleAll}
              className="text-xs font-semibold text-[#0B3B24] hover:underline"
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
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate("/admin/sub-admins")}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || Object.keys(permissions).length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0B3B24] text-white rounded-lg text-sm font-bold hover:bg-[#0a3320] disabled:opacity-50 transition-all"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditSubAdmin;
