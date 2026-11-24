import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, FileCheck, UploadCloud, XCircle, Clock, 
  Trash2, Eye, Download, ExternalLink, FileText, Loader2 
} from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import { deliveryApi } from "../../services/deliveryApi";
import { useDeliveryTranslation as useTranslation } from "../../i18n/useDeliveryTranslation";
import deliveryI18n from "../../i18n";

// Dynamic PDF.js loader for rendering PDF pages to canvas on mobile & desktop
let pdfjsPromise = null;
function loadPdfJs() {
  if (typeof window !== "undefined" && window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      } else {
        reject(new Error(deliveryI18n.t("dDocuments.pdf_js_failed_to_initialize")));
      }
    };
    script.onerror = () => reject(new Error(deliveryI18n.t("dDocuments.network_error_loading_pdf_js")));
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

async function renderPdfPages(arrayBuffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageImages = [];
  const maxPages = Math.min(pdf.numPages, 5);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    pageImages.push(canvas.toDataURL("image/jpeg", 0.92));
  }
  return pageImages;
}

const Documents = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [openingDocId, setOpeningDocId] = useState(null);
  const [viewModal, setViewModal] = useState(null);

  const [docs, setDocs] = useState([
    { id: "aadhar", title: t("dDocuments.aadhar_card"), status: "Pending", fileName: null, url: null },
    { id: "pan", title: t("dDocuments.pan_card"), status: "Pending", fileName: null, url: null },
    { id: "drivingLicense", title: t("dDocuments.driving_license"), status: "Pending", fileName: null, url: null },
    { id: "policeClearance", title: t("dDocuments.police_clearance"), status: "Pending", fileName: null, url: null },
    { id: "bankPassbook", title: t("dDocuments.bank_passbook"), status: "Pending", fileName: null, url: null },
  ]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await deliveryApi.getProfile();
      const profile = res.data.result;
      
      if (profile) {
        const pendingDocs = profile.pendingDocuments || {};
        const verifiedDocs = profile.documents || {};
        
        setDocs(prevDocs => prevDocs.map(doc => {
          if (pendingDocs[doc.id]) {
            const docUrl = pendingDocs[doc.id];
            const fileName = docUrl.split('/').pop() || `${doc.title} Document`;
            let status = pendingDocs.status === "pending" ? "Pending" : pendingDocs.status === "rejected" ? "Rejected" : "Verified";
            
            return {
              ...doc,
              fileName: fileName,
              url: docUrl,
              status: status,
              reason: pendingDocs.rejectionReason,
            };
          } else if (verifiedDocs[doc.id]) {
            const docUrl = verifiedDocs[doc.id];
            const fileName = docUrl.split('/').pop() || `${doc.title} Document`;
            return {
              ...doc,
              fileName: fileName,
              url: docUrl,
              status: "Verified",
            };
          }
          return {
            ...doc,
            fileName: null,
            url: null,
            status: "Pending",
            reason: null,
          };
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t("dDocuments.failed_to_fetch_documents"));
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

      toast.loading(t("dDocuments.uploading_to_server", { activeUploadId }), { id: "upload-doc" });
      await deliveryApi.updateDocuments(formData);
      toast.success(t("dDocuments.document_uploaded_successfully_to_server"), { id: "upload-doc" });
      
      await fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || t("dDocuments.failed_to_upload_document"), { id: "upload-doc" });
    } finally {
      setActiveUploadId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerDownload = (blobUrl, fileName) => {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("dDocuments.document_downloaded_tap_to_open"));
  };

  const handleViewFile = async (doc) => {
    if (!doc.url) return;
    setOpeningDocId(doc.id);

    const isPdf = doc.url.toLowerCase().includes(".pdf");
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const fileName = doc.fileName || `${doc.title || "document"}.${isPdf ? "pdf" : "jpg"}`;

    try {
      const res = await deliveryApi.viewDocument(doc.url);
      const data = res.data;

      if (isPdf) {
        const blob = new Blob([data], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        setViewModal({
          title: doc.title,
          fileName: fileName,
          type: "pdf",
          blobUrl: blobUrl,
          images: [],
          loading: true,
          error: false,
        });

        // On desktop/laptop: also open in new tab directly
        if (!isMobile) {
          window.open(blobUrl, "_blank");
        }

        // Render PDF pages to canvas images for in-app viewing
        try {
          const arrayBuffer = await data.arrayBuffer();
          const pageImages = await renderPdfPages(arrayBuffer);
          setViewModal((prev) => (prev ? { ...prev, images: pageImages, loading: false } : null));
        } catch (renderErr) {
          console.warn("PDF canvas rendering unavailable, using native viewer:", renderErr);
          setViewModal((prev) => (prev ? { ...prev, loading: false, error: true } : null));
          if (isMobile) {
            triggerDownload(blobUrl, fileName);
          }
        }
      } else {
        // Image document
        const blob = new Blob([data], { type: res.headers["content-type"] || "image/jpeg" });
        const blobUrl = URL.createObjectURL(blob);
        setViewModal({
          title: doc.title,
          fileName: fileName,
          type: "image",
          blobUrl: blobUrl,
          images: [blobUrl],
          loading: false,
          error: false,
        });
      }
    } catch (err) {
      console.error("Failed to view document:", err);
      toast.error(err.response?.data?.message || t("dDocuments.failed_to_load_document_from"));
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleDeleteFile = async (docId) => {
    if (!window.confirm(t("dDocuments.confirm_delete"))) return;

    try {
      toast.loading(t("dDocuments.deleting_document_from_server"), { id: "delete-doc" });
      await deliveryApi.deleteDocument(docId);
      toast.success(t("dDocuments.document_deleted_successfully_from_serve"), { id: "delete-doc" });
      await fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || t("dDocuments.failed_to_delete_document"), { id: "delete-doc" });
    }
  };

  const handleCloseModal = () => {
    if (viewModal?.blobUrl && viewModal.blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(viewModal.blobUrl);
    }
    setViewModal(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="flex items-center text-emerald-600 bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <FileCheck size={11} className="mr-0.5" /> {t("dDocuments.verified")}
          </span>
        );
      case "Pending":
        return (
          <span className="flex items-center text-amber-600 bg-amber-50 border border-amber-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <Clock size={11} className="mr-0.5" /> {t("dDocuments.pending")}
          </span>
        );
      case "Rejected":
        return (
          <span className="flex items-center text-rose-600 bg-rose-50 border border-rose-100/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
            <XCircle size={11} className="mr-0.5" /> {t("dDocuments.rejected")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen pb-28 relative font-sans">
      
      {/* Sticky Deep Green Header Banner */}
      <div className="bg-[#1A4516] text-white py-3 px-5 sticky top-0 z-40 shadow-sm flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors mr-2 cursor-pointer"
          aria-label={t("dDocuments.go_back")}
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="text-sm font-black leading-tight tracking-tight">{t("dDocuments.my_documents")}</h1>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*,.pdf" 
      />

      {/* Main Content Area */}
      <div className="bg-white rounded-t-[32px] -mt-5 pt-10 px-4 space-y-3 relative z-10">
        {loading && <div className="text-center py-4 text-sm text-gray-500">{t("dDocuments.loading_documents")}</div>}
        {!loading && docs.map((doc) => (
          <Card key={doc.id} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="font-bold text-gray-800 text-xs">{doc.title}</h4>
              {doc.url ? getStatusBadge(doc.status) : (
                <span className="text-[9px] text-gray-400 font-medium italic">{t("dDocuments.not_uploaded")}</span>
              )}
            </div>

            {doc.fileName && (
              <p className="text-[10px] text-gray-400 mb-2.5 flex items-center">
                <span className="truncate max-w-[200px] font-medium">{doc.fileName}</span>
              </p>
            )}

            {doc.status === "Rejected" && doc.reason && (
              <div className="bg-rose-50/60 border border-rose-100/50 text-rose-700 text-[10px] p-2 rounded-lg mb-2.5 font-medium leading-normal">{t("dDocuments.reason", { reason: doc.reason })}
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                size="sm" 
                className="flex-1 text-[10px] h-8 bg-[#1A4516] hover:bg-[#153b12] text-white border-none rounded-lg font-bold flex justify-center items-center gap-1.5" 
                onClick={() => handleUploadClick(doc.id)}
                disabled={activeUploadId !== null}
              >
                <UploadCloud size={13} /> 
                {doc.url ? t("dDocuments.change_re_upload") : t("dDocuments.upload_document")}
              </Button>
              
              {doc.url && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-[10px] h-8 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-bold flex justify-center items-center gap-1"
                    onClick={() => handleViewFile(doc)}
                    disabled={openingDocId === doc.id}
                  >
                    <Eye size={12} />
                    {openingDocId === doc.id ? t("dDocuments.opening") : t("dDocuments.view_file")}
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-2.5 text-[10px] h-8 border-rose-100 text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex justify-center items-center"
                    onClick={() => handleDeleteFile(doc.id)}
                    title={t("dDocuments.delete_document_from_server")}
                  >
                    <Trash2 size={13} />
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* In-App Document Viewer Modal (Mobile & Desktop Friendly) */}
      {viewModal && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          {/* Top Bar with actions */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col max-w-[60%]">
              <span className="text-white text-xs font-bold truncate">{viewModal.title}</span>
              <span className="text-gray-400 text-[10px] truncate">{viewModal.fileName}</span>
            </div>

            <div className="flex items-center gap-2">
              {viewModal.type === "pdf" && (
                <>
                  <button
                    onClick={() => triggerDownload(viewModal.blobUrl, viewModal.fileName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A4516] hover:bg-[#153b12] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title={t("dDocuments.download_open_with_phone_pdf")}
                  >
                    <Download size={13} />
                    <span>{t("dDocuments.open_in_app")}</span>
                  </button>

                  <button
                    onClick={() => window.open(viewModal.blobUrl, "_blank")}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title={t("dDocuments.open_in_new_tab")}
                  >
                    <ExternalLink size={16} />
                  </button>
                </>
              )}

              <button 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
                onClick={handleCloseModal}
              >
                <XCircle size={22} />
              </button>
            </div>
          </div>

          {/* Modal Content Scroll Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* If loading PDF pages */}
            {viewModal.loading && (
              <div className="flex flex-col items-center justify-center py-12 text-white">
                <Loader2 size={36} className="animate-spin text-emerald-500 mb-3" />
                <p className="text-xs font-medium text-gray-300">{t("dDocuments.rendering_document_pages")}</p>
              </div>
            )}

            {/* If images available (image doc or rendered PDF pages) */}
            {!viewModal.loading && viewModal.images.length > 0 && (
              <div className="space-y-4 max-w-full my-auto flex flex-col items-center">
                {viewModal.images.map((imgSrc, index) => (
                  <div key={index} className="relative shadow-2xl rounded-xl overflow-hidden max-w-full bg-white">
                    <img 
                      src={imgSrc} 
                      alt={t("dDocuments.page", { title: viewModal.title, v2: index + 1 })} 
                      className="max-w-full max-h-[82vh] object-contain block"
                    />
                    {viewModal.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{t("dDocuments.page_of", { v1: index + 1, length: viewModal.images.length })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* If PDF rendering failed or was skipped */}
            {!viewModal.loading && viewModal.images.length === 0 && viewModal.type === "pdf" && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center max-w-sm text-white my-auto flex flex-col items-center">
                <FileText size={48} className="text-emerald-400 mb-3" />
                <h3 className="text-sm font-bold mb-1">{viewModal.title}</h3>
                <p className="text-xs text-gray-300 mb-5 max-w-[240px]">
                  {t("dDocuments.pdf_is_ready_to_view")}
                </p>
                <button
                  onClick={() => triggerDownload(viewModal.blobUrl, viewModal.fileName)}
                  className="w-full py-2.5 bg-[#1A4516] hover:bg-[#153b12] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download size={14} /> {t("dDocuments.open_in_phone_pdf_viewer")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
