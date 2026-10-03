import axiosInstance from '@core/api/axios';
import { invalidateCache } from '@core/api/dedupe';

/**
 * Admin platform / delivery / centralized settings endpoints.
 * Per-domain split (P4.5).
 */
export const adminSettingsApi = {
    getPlatformSettings: () => axiosInstance.get('/admin/settings/platform'),
    updatePlatformSettings: (data) =>
        axiosInstance.put('/admin/settings/platform', data),

    getDeliveryFinanceSettings: () =>
        axiosInstance.get('/admin/settings/delivery'),
    updateDeliveryFinanceSettings: async (data) => {
        const res = await axiosInstance.put('/admin/settings/delivery', data);
        invalidateCache('/settings');
        return res;
    },

    // Centralized settings (public GET, admin PUT)
    getSettings: (params = {}) =>
        axiosInstance.get('/settings', {
            params: { ...params, _t: Date.now() },
        }),
    updateSettings: async (data) => {
        const res = await axiosInstance.put('/settings', data);
        invalidateCache('/settings');
        return res;
    },
    uploadSettingsImage: (formData, type = 'logo') =>
        axiosInstance.post(`/settings/upload?type=${type}`, formData),
};

export default adminSettingsApi;
