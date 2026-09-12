import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  MoreVertical,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Trash2,
  KeyRound,
  RefreshCw,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminSubAdminApi } from "../services/api/subAdminApi";
import { ADMIN_SECTIONS } from "@core/context/PermissionContext";

const SubAdminManagement = () => {
  const navigate = useNavigate();
  const [subAdmins, setSubAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuId, setActionMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubAdmins = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminSubAdminApi.list();
      setSubAdmins(res.data.results || res.data.result || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load Sub Admins");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  const handleToggleStatus = async (id) => {
    try {
      const res = await adminSubAdminApi.toggleStatus(id);
      const updated = res.data.result;
      setSubAdmins((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isActive: updated.isActive } : a))
      );
      toast.success(updated.isActive ? "Sub Admin activated" : "Sub Admin deactivated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle status");
    }
    setActionMenuId(null);
  };

  const handleDelete = async (id) => {
    try {
      await adminSubAdminApi.delete(id);
      setSubAdmins((prev) => prev.filter((a) => a._id !== id));
      toast.success("Sub Admin deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete Sub Admin");
    }
    setDeleteConfirmId(null);
    setActionMenuId(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal || !newPassword) return;
    const pwd = newPassword.trim();
    if (pwd.length < 10) {
      toast.error("Password must be at least 10 characters");
      return;
    }
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      toast.error("Password must contain lowercase, uppercase, and a number");
      return;
    }
    try {
      setIsSubmitting(true);
      await adminSubAdminApi.resetPassword(resetPasswordModal, { newPassword: pwd });
      toast.success("Password reset successfully");
      setResetPasswordModal(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAdmins = subAdmins.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  const getPermissionCount = (permissions) => {
    if (!permissions || typeof permissions !== "object") return 0;
    return Object.keys(permissions).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#0B3B24]" />
            Sub Admin Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage sub admin accounts and their permissions
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/sub-admins/create")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3B24] text-white rounded-lg text-sm font-semibold hover:bg-[#0a3320] transition-all shadow-sm"
        >
          <Plus size={16} />
          Create Sub Admin
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 focus:border-[#0B3B24]/30 transition-all"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{subAdmins.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total Sub Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {subAdmins.filter((a) => a.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShieldX className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {subAdmins.filter((a) => !a.isActive).length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Deactivated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            {searchQuery ? "No Sub Admins match your search" : "No Sub Admins created yet"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate("/admin/sub-admins/create")}
              className="mt-4 text-sm text-[#0B3B24] font-semibold hover:underline"
            >
              Create your first Sub Admin →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-visible">
          <div className="overflow-x-auto overflow-y-visible min-h-[250px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin, i) => (
                  <motion.tr
                    key={admin._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B3B24]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#0B3B24]">
                            {admin.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-800">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        {admin.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
                        {getPermissionCount(admin.permissions)} sections
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {admin.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                        <Calendar size={12} className="text-slate-400" />
                        {admin.createdAt
                          ? new Date(admin.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-slate-500 text-xs">
                        {admin.lastLogin
                          ? new Date(admin.lastLogin).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuId(actionMenuId === admin._id ? null : admin._id)
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical size={16} className="text-slate-500" />
                        </button>

                        <AnimatePresence>
                          {actionMenuId === admin._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 w-48"
                            >
                              <button
                                onClick={() => {
                                  navigate(`/admin/sub-admins/${admin._id}/edit`);
                                  setActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Pencil size={14} />
                                Edit Permissions
                              </button>
                              <button
                                onClick={() => handleToggleStatus(admin._id)}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {admin.isActive ? (
                                  <>
                                    <ToggleLeft size={14} className="text-red-400" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight size={14} className="text-emerald-500" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setResetPasswordModal(admin._id);
                                  setActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <KeyRound size={14} />
                                Reset Password
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(admin._id);
                                  setActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} />
                                Delete Account
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                Delete Sub Admin?
              </h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                This action cannot be undone. The Sub Admin will lose all access immediately.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setResetPasswordModal(null);
              setNewPassword("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound size={18} className="text-[#0B3B24]" />
                  Reset Password
                </h3>
                <button
                  onClick={() => {
                    setResetPasswordModal(null);
                    setNewPassword("");
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 10 chars, upper + lower + number"
                    className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B3B24]/20 focus:border-[#0B3B24]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setResetPasswordModal(null);
                    setNewPassword("");
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isSubmitting || !newPassword}
                  className="flex-1 px-4 py-2.5 bg-[#0B3B24] text-white rounded-lg text-sm font-semibold hover:bg-[#0a3320] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away handler for action menu */}
      {actionMenuId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActionMenuId(null)}
        />
      )}
    </div>
  );
};

export default SubAdminManagement;
