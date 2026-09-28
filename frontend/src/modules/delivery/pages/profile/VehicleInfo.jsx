import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, ShieldCheck, FileText, AlertCircle, Edit2, Clock, XCircle, CheckCircle } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import Input from "@/shared/components/ui/Input";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { deliveryApi } from "../../services/deliveryApi";
import { toast } from "sonner";

const VehicleInfo = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const pendingInfo = user?.pendingVehicleInfo || {};
  const isPending = pendingInfo.status === "pending";
  const isRejected = pendingInfo.status === "rejected";

  const [formData, setFormData] = useState({
    vehicleType: user?.vehicleType || "bike",
    vehicleNumber: user?.vehicleNumber || "",
    drivingLicenseNumber: user?.drivingLicenseNumber || "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      toast.loading("Submitting vehicle info...", { id: "update-vehicle" });
      await deliveryApi.updateVehicleInfo(formData);
      toast.success("Vehicle info submitted for verification", { id: "update-vehicle" });
      setIsEditing(false);
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update vehicle info", { id: "update-vehicle" });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayValue = (field, originalValue) => {
    if (isPending && pendingInfo[field] && pendingInfo[field] !== originalValue) {
      return (
        <span>
          <span className="line-through text-gray-400 mr-2">{originalValue || "N/A"}</span>
          <span className="text-amber-600 font-bold">{pendingInfo[field]}</span>
        </span>
      );
    }
    return originalValue || "N/A";
  };

  return (
    <div className="bg-white min-h-screen pb-28 relative font-sans">
      {/* Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white pt-4 pb-12 px-6 relative sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
              aria-label="Go Back"
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 className="text-lg font-black leading-tight tracking-tight">Vehicle Information</h1>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              <Edit2 size={12} className="mr-1.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-t-[32px] -mt-5 pt-10 px-5 space-y-4 relative z-10">
        
        {isPending && !isEditing && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start">
            <Clock size={16} className="text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Your vehicle information updates are pending approval from the admin.
            </p>
          </div>
        )}

        {isRejected && !isEditing && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start">
            <XCircle size={16} className="text-rose-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 font-medium leading-relaxed">
              <p>Your vehicle information updates were rejected.</p>
              {pendingInfo.rejectionReason && (
                <p className="mt-1 font-bold">Reason: {pendingInfo.rejectionReason}</p>
              )}
            </div>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">Vehicle Type</label>
                <div className="relative">
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A4516]/20 focus:border-[#1A4516] appearance-none text-sm font-medium"
                    required
                  >
                    <option value="bike">Bike</option>
                    <option value="scooter">Scooter</option>
                    <option value="cycle">Cycle</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <Input
                label="Plate Number"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                placeholder="e.g. MH 01 AB 1234"
                required
              />

              <Input
                label="Driving License Number"
                name="drivingLicenseNumber"
                value={formData.drivingLicenseNumber}
                onChange={handleChange}
                placeholder="Enter DL Number"
                required
              />
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-bold rounded-xl h-11"
                onClick={() => {
                  setFormData({
                    vehicleType: user?.vehicleType || "bike",
                    vehicleNumber: user?.vehicleNumber || "",
                    drivingLicenseNumber: user?.drivingLicenseNumber || "",
                  });
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 font-bold rounded-xl h-11 bg-[#1A4516] hover:bg-[#153b12] text-white"
                isLoading={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <>
            {/* Vehicle Card */}
            <Card className="p-4 bg-gradient-to-br from-gray-900 to-[#123610] text-white border-none shadow-md rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 blur-xl" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-white/50 text-[9px] uppercase tracking-wider font-bold mb-0.5">Vehicle Plate Number</p>
                  <h3 className="text-xl font-black tracking-wide break-all pr-2">
                    {getDisplayValue("vehicleNumber", user?.vehicleNumber)}
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5 uppercase">
                    {getDisplayValue("vehicleType", user?.vehicleType)}
                  </p>
                </div>
                <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                  <Truck size={18} className="text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 pt-3 border-t border-white/10 relative z-10">
                <div>
                  <p className="text-white/40 text-[9px] uppercase font-bold tracking-wider">DL Number</p>
                  <p className="text-xs font-semibold mt-0.5 break-all">{getDisplayValue("drivingLicenseNumber", user?.drivingLicenseNumber)}</p>
                </div>
              </div>
            </Card>

            {/* Info Box */}
            <div className="bg-[#1A4516]/5 border border-[#1A4516]/10 p-3.5 rounded-xl flex items-start">
              <AlertCircle size={16} className="text-[#1A4516] mr-2.5 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#1A4516] font-medium leading-relaxed">
                Changes to your vehicle information will require admin approval before becoming active.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VehicleInfo;
