import axiosInstance from '@core/api/axios';

/**
 * Opens an uploaded applicant document (seller / delivery KYC).
 *
 * Stored PDFs cannot be opened directly from their storage URL (the storage
 * provider answers 401), so the file is fetched through the authenticated admin
 * API and shown from a temporary blob URL.
 *
 * On mobile devices, since mobile browsers (Chrome on Android) lack built-in
 * PDF viewers and show a blank white screen for blob URLs, it triggers a native
 * download/open handoff instead of an empty tab.
 *
 * Returns an error message string on failure, or null on success.
 */
export async function openAdminDocument(url) {
    if (!url) return 'No file is available for this document';

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isPdf = String(url).toLowerCase().includes('.pdf');

    // On desktop, open the tab synchronously so popup blockers allow it.
    // On mobile, avoid opening an empty blank tab.
    let tab = null;
    if (!isMobile) {
        tab = window.open('', '_blank');
        if (tab) {
            tab.document.write('<title>Document</title><p style="font:14px sans-serif;padding:24px">Loading document...</p>');
        }
    }

    try {
        const res = await axiosInstance.get('/admin/documents/view', {
            params: { url },
            responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(res.data);

        if (tab) {
            tab.location.href = blobUrl;
        } else if (isMobile && isPdf) {
            const fileName = url.split('/').pop() || 'document.pdf';
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            window.open(blobUrl, '_blank');
        }

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
