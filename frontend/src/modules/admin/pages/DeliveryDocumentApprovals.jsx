import React, { useState, useEffect } from "react";
import { Search, Eye, CheckCircle, XCircle } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import adminApi from "../services/api";

const DeliveryDocumentApprovals = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingDeliveryDocuments({ limit: 100 });
      setPartners(res.data.result.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch pending documents");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      toast.loading("Approving documents...");
      await adminApi.approveDeliveryDocuments(id);
      toast.success("Documents approved successfully");
      setSelectedPartner(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve documents");
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      toast.loading("Rejecting documents...");
      await adminApi.rejectDeliveryDocuments(id, { reason });
      toast.success("Documents rejected");
      setSelectedPartner(null);
      fetchPendingDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject documents");
    }
  };

  const getPendingFields = (pendingDocs) => {
    const fields = ["aadhar", "pan", "drivingLicense", "policeClearance", "bankPassbook"];
    return fields.filter(f => pendingDocs && pendingDocs[f] && pendingDocs[f] !== "");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Document Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review updated documents from delivery partners.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Partner Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Pending Documents</th>
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
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No pending document approvals.</td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{partner.name}</td>
                    <td className="px-4 py-3 text-gray-600">{partner.phone}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex gap-2 flex-wrap">
                        {getPendingFields(partner.pendingDocuments).map(field => (
                          <span key={field} className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPartner(partner)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Review Documents: {selectedPartner.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedPartner.phone}</p>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/30">
              {getPendingFields(selectedPartner.pendingDocuments).map(field => {
                const newDocUrl = selectedPartner.pendingDocuments[field];
                const oldDocUrl = selectedPartner.documents?.[field];

                return (
                  <div key={field} className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="font-semibold text-gray-800 capitalize border-b pb-2">{field}</h4>
                    <div className="space-y-4">
                      {/* Old Document */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Current Document</p>
                        {oldDocUrl ? (
                          oldDocUrl.toLowerCase().includes('.pdf') ? (
                            <a href={oldDocUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">
                              <Eye size={14} /> View Current PDF
                            </a>
                          ) : (
                            <img src={oldDocUrl} alt="Old" className="w-full h-32 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewDoc(oldDocUrl)} />
                          )
                        ) : (
                          <div className="w-full h-32 bg-gray-50 flex items-center justify-center rounded border border-gray-200 border-dashed text-gray-400 text-sm">
                            None uploaded
                          </div>
                        )}
                      </div>

                      {/* New Document */}
                      <div>
                        <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">New Document</p>
                        {newDocUrl.toLowerCase().includes('.pdf') ? (
                          <a href={newDocUrl} target="_blank" rel="noreferrer" className="text-emerald-600 text-sm hover:underline flex items-center gap-1">
                            <Eye size={14} /> View New PDF
                          </a>
                        ) : (
                          <img src={newDocUrl} alt="New" className="w-full h-40 object-cover rounded border-2 border-emerald-500/30 cursor-pointer shadow-sm hover:opacity-90 transition-opacity" onClick={() => setViewDoc(newDocUrl)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
              <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300" onClick={() => handleReject(selectedPartner._id)}>
                <XCircle size={16} className="mr-2" /> Reject Updates
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => handleApprove(selectedPartner._id)}>
                <CheckCircle size={16} className="mr-2" /> Approve All
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Image Fullscreen Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewDoc(null)}>
          <img src={viewDoc} alt="Document" className="max-w-full max-h-[90vh] object-contain rounded" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 p-2 rounded-full" onClick={() => setViewDoc(null)}>
            <XCircle size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryDocumentApprovals;
