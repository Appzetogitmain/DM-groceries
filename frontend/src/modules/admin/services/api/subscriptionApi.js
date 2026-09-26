import axiosInstance from '@core/api/axios';

export const adminSubscriptionsApi = {
    // Features
    getFeatures: (params) => axiosInstance.get("/admin/subscriptions/features", { params }),
    getFeatureById: (id) => axiosInstance.get(`/admin/subscriptions/features/${id}`),
    createFeature: (data) => axiosInstance.post("/admin/subscriptions/features", data),
    updateFeature: (id, data) => axiosInstance.put(`/admin/subscriptions/features/${id}`, data),
    toggleFeatureStatus: (id) => axiosInstance.patch(`/admin/subscriptions/features/${id}/status`),
    deleteFeature: (id) => axiosInstance.delete(`/admin/subscriptions/features/${id}`),

    // Plans
    getPlans: (params) => axiosInstance.get("/admin/subscriptions/plans", { params }),
    getPlanById: (id) => axiosInstance.get(`/admin/subscriptions/plans/${id}`),
    createPlan: (data) => axiosInstance.post("/admin/subscriptions/plans", data),
    updatePlan: (id, data) => axiosInstance.put(`/admin/subscriptions/plans/${id}`, data),
    togglePlanStatus: (id) => axiosInstance.patch(`/admin/subscriptions/plans/${id}/status`),
    deletePlan: (id) => axiosInstance.delete(`/admin/subscriptions/plans/${id}`),

    // Offers
    getOffers: (params) => axiosInstance.get("/admin/subscriptions/offers", { params }),
    getOfferById: (id) => axiosInstance.get(`/admin/subscriptions/offers/${id}`),
    createOffer: (data) => axiosInstance.post("/admin/subscriptions/offers", data),
    updateOffer: (id, data) => axiosInstance.put(`/admin/subscriptions/offers/${id}`, data),
    toggleOfferStatus: (id) => axiosInstance.patch(`/admin/subscriptions/offers/${id}/status`),
    deleteOffer: (id) => axiosInstance.delete(`/admin/subscriptions/offers/${id}`),

    // Subscribers
    getSubscribers: (params) => axiosInstance.get("/admin/subscriptions/subscribers", { params }),
    getSubscriberById: (id) => axiosInstance.get(`/admin/subscriptions/subscribers/${id}`),
    getSubscriptionStats: () => axiosInstance.get("/admin/subscriptions/subscribers/stats"),
};
