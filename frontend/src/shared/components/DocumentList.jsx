import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@core/api/axios';

/**
 * DocumentList component
 * Displays list of user documents, allows inline deletion and viewing.
 */
export const DocumentList = ({
  documents = [],
  onDeleteSuccess,
  isLoading = false,
  emptyMessage = 'No documents uploaded yet.',
}) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document from the server?')) {
      return;
    }

    try {
      setDeletingId(docId);
      await axiosInstance.delete(`/documents/${docId}`);
      toast.success('Document deleted from server');
      if (typeof onDeleteSuccess === 'function') {
        onDeleteSuccess(docId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Loading documents...</span>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {documents.map((doc) => {
        const isDeleting = deletingId === doc._id;
        const isPdf =
          doc.mimeType === 'application/pdf' ||
          doc.format?.toLowerCase() === 'pdf' ||
          doc.secureUrl?.endsWith('.pdf');

        return (
          <div
            key={doc._id}
            className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {doc.objectKey?.split('/').pop() || doc.publicId || 'Document'}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                    {doc.format || (isPdf ? 'PDF' : 'IMAGE')}
                  </span>
                  <span>{formatSize(doc.bytes)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0 ml-3">
              {doc.secureUrl && (
                <a
                  href={doc.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
                  title="View document"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => handleDelete(doc._id)}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete from server"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentList;

