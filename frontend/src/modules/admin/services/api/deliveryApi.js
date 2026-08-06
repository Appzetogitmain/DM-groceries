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
    getActiveFleet: (params) =>
        axiosInstance.get('/admin/active-fleet', { params }),
    getDeliveryReviews: (params) =>
        axiosInstance.get('/delivery-reviews/admin', { params }),
    getActiveSosAlerts: () => axiosInstance.get('/admin/sos'),
    getResolvedSosAlerts: () => axiosInstance.get('/admin/sos/history'),
    resolveSosAlert: (id, data) => axiosInstance.put(`/admin/sos/${id}/resolve`, data),
};

export default adminDeliveryApi;
