import axiosInstance from '@core/api/axios';

export const adminPackagesApi = {
    getPackageSettings: () => axiosInstance.get('/packages/admin/settings'),
    updatePackageSettings: (data) => axiosInstance.put('/packages/admin/settings', data),
    getPackages: (params) => axiosInstance.get('/packages/admin', { params }),
    getPackageById: (id) => axiosInstance.get(`/packages/admin/${id}`),
    approvePackage: (id, data = {}) => axiosInstance.patch(`/packages/admin/${id}/approve`, data),
    rejectPackage: (id, data = {}) => axiosInstance.patch(`/packages/admin/${id}/reject`, data),
};

export default adminPackagesApi;

