import axiosInstance from '@core/api/axios';

/**
 * Admin delivery-partner endpoints (lifecycle, active fleet).
 * Per-domain split (P4.5).
 */
export const adminDeliveryApi = {
    getDeliveryPartners: (params) =>
        axiosInstance.get('/admin/delivery-partners', { params }),
    approveDeliveryPartner: (id) =>
        axiosInstance.patch(`/admin/delivery-partners/approve/${id}`),
    rejectDeliveryPartner: (id) =>
        axiosInstance.delete(`/admin/delivery-partners/reject/${id}`),
    getPendingDeliveryDocuments: (params) =>
        axiosInstance.get('/admin/delivery-partners/pending-documents', { params }),
    approveDeliveryDocuments: (id) =>
        axiosInstance.patch(`/admin/delivery-partners/${id}/approve-documents`),
    rejectDeliveryDocuments: (id, data) =>
        axiosInstance.patch(`/admin/delivery-partners/${id}/reject-documents`, data),
    getPendingDeliveryVehicleInfo: (params) =>
        axiosInstance.get('/admin/delivery-partners/pending-vehicle-info', { params }),
    approveDeliveryVehicleInfo: (id) =>
        axiosInstance.patch(`/admin/delivery-partners/${id}/approve-vehicle-info`),
    rejectDeliveryVehicleInfo: (id, data) =>
        axiosInstance.patch(`/admin/delivery-partners/${id}/reject-vehicle-info`, data),
    getActiveFleet: (params) =>
        axiosInstance.get('/admin/active-fleet', { params }),
    getDeliveryReviews: (params) =>
        axiosInstance.get('/delivery-reviews/admin', { params }),
    getActiveSosAlerts: () => axiosInstance.get('/admin/sos'),
    getResolvedSosAlerts: () => axiosInstance.get('/admin/sos/history'),
    resolveSosAlert: (id, data) => axiosInstance.put(`/admin/sos/${id}/resolve`, data),
};

export default adminDeliveryApi;
