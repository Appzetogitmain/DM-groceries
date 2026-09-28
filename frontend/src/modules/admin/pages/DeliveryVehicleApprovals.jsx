import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Truck } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import adminApi from "../services/api";

const DeliveryVehicleApprovals = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    fetchPendingVehicleInfo();
  }, []);

  const fetchPendingVehicleInfo = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingDeliveryVehicleInfo({ limit: 100 });
      setPartners(res.data.result.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch pending vehicle info");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      toast.loading("Approving vehicle info...");
      await adminApi.approveDeliveryVehicleInfo(id);
      toast.success("Vehicle info approved successfully");
      setSelectedPartner(null);
      fetchPendingVehicleInfo();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve vehicle info");
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      toast.loading("Rejecting vehicle info...");
      await adminApi.rejectDeliveryVehicleInfo(id, { reason });
      toast.success("Vehicle info rejected");
      setSelectedPartner(null);
      fetchPendingVehicleInfo();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject vehicle info");
    }
  };

  const getPendingFields = (pendingInfo, partner) => {
    const fields = ["vehicleType", "vehicleModel", "vehicleNumber", "vehicleColor", "fuelType", "drivingLicenseNumber"];
    return fields.filter(f => pendingInfo && pendingInfo[f] && pendingInfo[f] !== partner[f]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vehicle Info Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review updated vehicle details from delivery partners.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Partner Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Changed Fields</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No pending vehicle info approvals.</td>
                </tr>
              ) : (
                partners.map((partner) => {
                  const changedFields = getPendingFields(partner.pendingVehicleInfo, partner);
                  return (
                    <tr key={partner._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{partner.name}</td>
                      <td className="px-4 py-3 text-gray-600">{partner.phone}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex gap-2 flex-wrap">
                          {changedFields.length > 0 ? changedFields.map(field => (
                            <span key={field} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              {field}
                            </span>
                          )) : (
                            <span className="text-gray-400 italic">No changes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPartner(partner)}>
                          Review & Approve
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden bg-white rounded-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Truck size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Review Vehicle Info</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedPartner.name} • {selectedPartner.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 min-h-0 bg-gray-50/30">
              <div className="space-y-4">
                {["vehicleType", "vehicleNumber", "drivingLicenseNumber"].map(field => {
                  const newVal = selectedPartner.pendingVehicleInfo[field];
                  const oldVal = selectedPartner[field];
                  const isChanged = newVal && newVal !== oldVal;

                  if (!newVal && !oldVal) return null;

                  return (
                    <div key={field} className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="w-full sm:w-1/3">
                        <h4 className="font-semibold text-gray-800 capitalize text-sm">{field.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      </div>
                      <div className="w-full sm:w-2/3 flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Current</p>
                          <p className={`text-sm break-words ${isChanged ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                            {oldVal || "N/A"}
                          </p>
                        </div>
                        {isChanged && (
                          <div className="flex-1 min-w-0 pl-3 sm:pl-4 border-l border-emerald-100">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">New</p>
                            <p className="text-sm text-emerald-700 font-bold break-words">
                              {newVal}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 bg-white flex-shrink-0">
              <Button variant="outline" className="w-full sm:w-auto justify-center border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300" onClick={() => handleReject(selectedPartner._id)}>
                <XCircle size={16} className="mr-2" /> Reject Updates
              </Button>
              <Button className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => handleApprove(selectedPartner._id)}>
                <CheckCircle size={16} className="mr-2" /> Approve All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryVehicleApprovals;
