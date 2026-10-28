import { useState, useCallback } from 'react';
import axiosInstance from '@core/api/axios';

/**
 * Hook for uploading documents via signed Cloudinary upload intent:
 * 1. POST /api/media/upload-intent -> get signed Cloudinary URL + fields
 * 2. POST to Cloudinary directly from the browser (bypasses server payload bottleneck)
 * 3. POST /api/media/confirm -> persist metadata in MongoDB
 */
export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(async (file, options = {}) => {
    const {
      entityType = 'document',
      entityId = null,
      tags = [],
    } = options;

    if (!file) throw new Error('File is required');

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const mimeType = file.type || 'application/pdf';
      const resourceType = mimeType === 'application/pdf' ? 'document' : 'image';

      // Step 1: Request upload intent from backend
      const intentRes = await axiosInstance.post('/media/upload-intent', {
        entityType,
        entityId,
        resourceType,
        mimeType,
        fileSize: file.size,
        extension: ext,
        tags,
      });

      const { intentId, uploadUrl, uploadFields, publicId } =
        intentRes.data?.result || intentRes.data?.data || {};

      if (!uploadUrl) {
        throw new Error('Upload endpoint unavailable from server');
      }

      setProgress(25);

      // Step 2: Upload directly to Cloudinary
      const formData = new FormData();
      Object.entries(uploadFields || {}).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val);
        }
      });
      formData.append('file', file);

      const cloudRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!cloudRes.ok) {
        const errorText = await cloudRes.text().catch(() => '');
        throw new Error(`Cloud storage upload failed: ${cloudRes.status} ${errorText}`);
      }

      const cloudData = await cloudRes.json();
      setProgress(75);

      // Step 3: Confirm with backend to create MediaMetadata record
      const confirmRes = await axiosInstance.post('/media/confirm', {
        intentId,
        publicId: cloudData.public_id || publicId,
        secureUrl: cloudData.secure_url,
        resourceType,
        format: cloudData.format || ext,
        mimeType,
        bytes: cloudData.bytes || file.size,
        entityType,
        entityId,
        tags,
      });

      setProgress(100);
      const result = confirmRes.data?.result || confirmRes.data?.data || confirmRes.data;
      return result;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Document upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return { upload, uploading, progress, error, reset };
}

export default useDocumentUpload;

