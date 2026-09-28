import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Calendar, Droplet } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { toast } from "sonner";
import { deliveryApi } from "../../services/deliveryApi";
import { useAuth } from "@core/context/AuthContext";

const PersonalDetails = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isBloodGroupOpen, setIsBloodGroupOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    dob: "",
    bloodGroup: "",
    id: "",
  });

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await deliveryApi.getProfile();
      if (res.data.success || res.data.result) {
        const user = res.data.result || {};
        
        let formattedDob = "";
        if (user.dob) {
          try {
            const d = new Date(user.dob);
            if (!isNaN(d.getTime())) {
              formattedDob = d.toISOString().split("T")[0];
            } else {
              formattedDob = user.dob;
            }
          } catch(e) {}
        }

        setFormData({
          name: user.name || "",
          phone: user.phone || "",
          email: user.email || "",
          address: user.address || "",
          dob: formattedDob,
          bloodGroup: user.bloodGroup || "",
          id: user._id || "",
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await deliveryApi.updateProfile({
        name: formData.name,
        email: formData.email,
        address: formData.address,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
      });
      setIsEditing(false);
      await refreshUser();
      toast.success("Personal details updated successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="bg-white min-h-screen pb-28 relative font-sans">
      
      {/* Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white pt-4 pb-12 px-6 relative sticky top-0 z-50">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
            aria-label="Go Back"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-lg font-black leading-tight tracking-tight">Personal Details</h1>
          <div className="ml-auto">
            {isEditing ? (
              <button 
                onClick={handleSave} 
                className="h-8 px-4 rounded-full bg-white text-[#1A4516] text-xs font-black hover:bg-gray-100 transition-colors cursor-pointer shadow-sm flex items-center gap-1"
              >
                <Save size={12} /> Save
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(true)} 
                className="h-8 px-4 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area overlapping with rounded corners */}
      <div className="bg-white rounded-t-[32px] -mt-5 pt-10 px-5 space-y-4 relative z-10">
        
        {/* Profile Photo */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative">
            <div className="w-18 h-18 rounded-full p-0.5 bg-white shadow-md">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="Profile"
                className="w-full h-full rounded-full object-cover bg-gray-100"
              />
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 bg-[#1A4516] text-white p-1 rounded-full shadow-md hover:bg-[#153b12] transition-colors cursor-pointer">
                <User size={12} />
              </button>
            )}
          </div>
          <p className="mt-2.5 text-[11px] font-bold text-gray-400">Delivery Partner ID: {formData.id ? formData.id.substring(0, 6).toUpperCase() : ""}</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-3.5 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            readOnly={!isEditing} 
            icon={User}
            className={!isEditing ? "bg-gray-50/60 border-transparent text-gray-700" : "bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#1A4516]/10 focus:border-[#1A4516]"}
          />
          
          <Input
            label="Phone Number"
            value={formData.phone}
            readOnly={true} 
            icon={Phone}
            className="bg-gray-50 border-transparent text-gray-400"
            helperText="Contact support to change phone number"
          />

          <Input
            label="Email Address"
            value={formData.email}
            readOnly={!isEditing}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            icon={Mail}
            type="email"
            className={!isEditing ? "bg-gray-50/60 border-transparent text-gray-700" : "bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#1A4516]/10 focus:border-[#1A4516]"}
          />

          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Current Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <MapPin size={16} />
              </div>
              <textarea
                value={formData.address}
                readOnly={!isEditing}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-all resize-none ${
                  !isEditing 
                    ? "bg-gray-50/60 border-transparent text-gray-700" 
                    : "bg-white border-gray-200 focus:ring-2 focus:ring-[#1A4516]/10 focus:border-[#1A4516]"
                }`}
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Date of Birth"
              value={formData.dob}
              type="date"
              readOnly={!isEditing}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
              icon={Calendar}
              className={!isEditing ? "bg-gray-50/60 border-transparent text-gray-700" : "bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#1A4516]/10 focus:border-[#1A4516]"}
            />
            <div className="w-full space-y-1 relative">
              <label className="block text-sm font-medium text-gray-700">Blood Group</label>
              <div 
                onClick={() => isEditing && setIsBloodGroupOpen(!isBloodGroupOpen)}
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm justify-between items-center ${
                  !isEditing 
                    ? "bg-gray-50/60 border-transparent text-gray-700" 
                    : "bg-white border-gray-200 text-gray-900 cursor-pointer shadow-sm focus-within:ring-2 focus-within:ring-[#1A4516]/10 focus-within:border-[#1A4516]"
                }`}
              >
                <span>{formData.bloodGroup || "Select Blood Group"}</span>
                {isEditing && (
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${isBloodGroupOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
              
              {isBloodGroupOpen && isEditing && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden py-1 top-[100%] max-h-48 overflow-y-auto">
                  {bloodGroups.map(bg => (
                    <div 
                      key={bg}
                      onClick={() => {
                        setFormData({...formData, bloodGroup: bg});
                        setIsBloodGroupOpen(false);
                      }}
                      className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#1A4516]/5 transition-colors ${
                        formData.bloodGroup === bg ? 'bg-[#1A4516]/10 text-[#1A4516] font-bold' : 'text-gray-700 font-medium'
                      }`}
                    >
                      {bg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="pt-4">
              <Button onClick={handleSave} className="w-full bg-[#1A4516] hover:bg-[#153b12] text-white py-3">
                <Save size={16} className="mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;
