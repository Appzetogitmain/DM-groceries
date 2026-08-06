import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileCheck, UploadCloud, XCircle, Clock } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import { deliveryApi } from "../../services/deliveryApi";

const Documents = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState(null);

  const [docs, setDocs] = useState([
    { id: "aadhar", title: "Aadhar Card", status: "Pending", fileName: null, url: null },
    { id: "pan", title: "PAN Card", status: "Pending", fileName: null, url: null },
    { id: "drivingLicense", title: "Driving License", status: "Pending", fileName: null, url: null },
    { id: "policeClearance", title: "Police Clearance", status: "Pending", fileName: null, url: null },
    { id: "bankPassbook", title: "Bank Passbook", status: "Pending", fileName: null, url: null },
  ]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await deliveryApi.getProfile();
      const profile = res.data.result;
      
      if (profile && profile.documents) {
        setDocs(prevDocs => prevDocs.map(doc => {
          const docUrl = profile.documents[doc.id];
          if (docUrl) {
            // Extract filename from URL or use a generic name
            const fileName = docUrl.split('/').pop() || `${doc.title} Document`;
            return {
              ...doc,
              fileName: fileName,
              url: docUrl,
              status: "Verified", // Assuming verified if it exists, since we don't have per-doc status in schema yet
            };
          }
          return doc;
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (id) => {
    setActiveUploadId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUploadId) return;

    try {
      const formData = new FormData();
      formData.append(activeUploadId, file);

      toast.loading(`Uploading ${activeUploadId}...`, { id: "upload-doc" });
      await deliveryApi.updateProfile(formData);
      toast.success("Document updated successfully", { id: "upload-doc" });
      
      // Refresh docs
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload document", { id: "upload-doc" });
    } finally {
      setActiveUploadId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="flex items-center text-emerald-600 bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <FileCheck size={11} className="mr-0.5" /> Verified
          </span>
        );
      case "Pending":
        return (
          <span className="flex items-center text-amber-600 bg-amber-50 border border-amber-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <Clock size={11} className="mr-0.5" /> Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="flex items-center text-rose-600 bg-rose-50 border border-rose-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <XCircle size={11} className="mr-0.5" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen pb-28 relative overflow-hidden font-sans">
      
      {/* Sticky Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white py-3 px-5 sticky top-0 z-40 shadow-sm flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
          aria-label="Go Back"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-sm font-black leading-tight tracking-tight">My Documents</h1>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*,.pdf" 
      />

      {/* Main Content Area overlapping with rounded corners */}
      <div className="bg-white rounded-t-[32px] -mt-5 pt-4 px-4 space-y-3 relative z-10">
        {loading && <div className="text-center py-4 text-sm text-gray-500">Loading documents...</div>}
        {!loading && docs.map((doc) => (
          <Card key={doc.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-bold text-gray-800 text-xs">{doc.title}</h4>
              {getStatusBadge(doc.status)}
            </div>

            {doc.fileName && (
              <p className="text-[10px] text-gray-400 mb-2.5 flex items-center">
                <span className="truncate max-w-[200px] font-medium">{doc.fileName}</span>
                {doc.uploadedOn && (
                  <>
                    <span className="mx-1.5">•</span>
                    <span className="font-medium">{doc.uploadedOn}</span>
                  </>
                )}
              </p>
            )}

            {doc.status === "Rejected" && (
              <div className="bg-rose-50/60 border border-rose-100/50 text-rose-700 text-[10px] p-2 rounded-lg mb-2.5 font-medium leading-normal">
                Reason: {doc.reason}
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                size="sm" 
                className="w-full text-[10px] h-7 bg-[#1A4516] hover:bg-[#153b12] text-white border-none rounded-lg font-bold flex justify-center items-center gap-1" 
                onClick={() => handleUploadClick(doc.id)}
                disabled={activeUploadId !== null}
              >
                <UploadCloud size={12} /> 
                {doc.status === "Rejected" ? "Re-upload" : "Update"}
              </Button>
              
              {doc.url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-[10px] h-7 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-bold"
                  onClick={() => window.open(doc.url, "_blank")}
                >
                  View File
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Documents;
