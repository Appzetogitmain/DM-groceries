import axiosInstance from '@core/api/axios';

/**
 * Opens an uploaded applicant document (seller / delivery KYC) in a new tab.
 *
 * Stored PDFs cannot be opened directly from their storage URL (the storage
 * provider answers 401), so the file is fetched through the authenticated admin
 * API and shown from a temporary blob URL.
 *
 * Returns an error message string on failure, or null on success.
 */
export async function openAdminDocument(url) {
    if (!url) return 'No file is available for this document';

    // Open the tab synchronously (inside the click) so popup blockers allow it.
    const tab = window.open('', '_blank');
    if (tab) {
        tab.document.write('<title>Document</title><p style="font:14px sans-serif;padding:24px">Loading document...</p>');
    }

    try {
        const res = await axiosInstance.get('/admin/documents/view', {
            params: { url },
            responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(res.data);
        if (tab) tab.location.href = blobUrl;
        else window.open(blobUrl, '_blank');
        // Keep it around long enough for the viewer to load, then free it.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
        return null;
    } catch (error) {
        if (tab) tab.close();
        // Error bodies arrive as a Blob because of responseType: 'blob'.
        try {
            const text = await error.response?.data?.text?.();
            const message = text ? JSON.parse(text).message : null;
            if (message) return message;
        } catch {
            // fall through to the generic message
        }
        return 'Could not open the document. Please try again.';
    }
}
