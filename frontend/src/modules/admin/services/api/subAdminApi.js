import axiosInstance from '@core/api/axios';

/**
 * Sub Admin management API endpoints.
 * Used by Super Admins to manage Sub Admin accounts.
 */
export const adminSubAdminApi = {
    // OTP Flow
    sendInviteOtp: (data) => axiosInstance.post('/admin/sub-admins/send-invite-otp', data),
    verifyEmail: (data) => axiosInstance.post('/admin/sub-admins/verify-email', data),

    // CRUD
    create: (data) => axiosInstance.post('/admin/sub-admins/create', data),
    list: () => axiosInstance.get('/admin/sub-admins'),
    getById: (id) => axiosInstance.get(`/admin/sub-admins/${id}`),
    update: (id, data) => axiosInstance.put(`/admin/sub-admins/${id}`, data),
    toggleStatus: (id) => axiosInstance.patch(`/admin/sub-admins/${id}/toggle-status`),
    delete: (id) => axiosInstance.delete(`/admin/sub-admins/${id}`),
    resetPassword: (id, data) => axiosInstance.post(`/admin/sub-admins/${id}/reset-password`, data),

    // Permissions Map
    getPermissionsMap: () => axiosInstance.get('/admin/sub-admins/permissions-map'),
};

export default adminSubAdminApi;
