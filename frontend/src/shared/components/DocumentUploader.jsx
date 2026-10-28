import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

/**
 * Reusable DocumentUploader component
 * Supports drag-and-drop or click to browse.
 * Uploads to Cloudinary server and triggers onUpload callback with saved metadata.
 */
export const DocumentUploader = ({
  onUpload,
  entityType = 'document',
  entityId = null,
  tags = [],
  accept = 'application/pdf,image/jpeg,image/png,image/webp',
  maxSizeMB = 15,
  label = 'Upload Document',
  description = 'PDF or image scans up to 15MB',
  disabled = false,
  className = '',
}) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { upload, uploading, progress, error, reset } = useDocumentUpload();

  const validateFile = (file) => {
    if (!file) return false;
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File size exceeds maximum limit of ${maxSizeMB}MB`);
      return false;
    }
    return true;
  };

  const handleFile = async (file) => {
    if (!validateFile(file)) return;
    setSelectedFile(file);
    try {
      const result = await upload(file, { entityType, entityId, tags });
      toast.success('Document uploaded successfully!');
      if (typeof onUpload === 'function') {
        onUpload(result);
      }
      setSelectedFile(null);
      reset();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  return (
    <div className={`w-full ${className}`}>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => {
          if (!disabled && !uploading) fileInputRef.current?.click();
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all text-center cursor-pointer ${
          dragOver
            ? 'border-brand-500 bg-brand-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-brand-400 bg-slate-50/60 hover:bg-slate-50'
        } ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="font-semibold text-slate-800 text-sm">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs space-y-1">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Uploading to server... {progress}%
              </p>
            </div>
          )}

          {error && !uploading && (
            <div className="flex items-center text-red-600 text-xs gap-1.5 mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploader;

