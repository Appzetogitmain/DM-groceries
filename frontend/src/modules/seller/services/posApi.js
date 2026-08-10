import axiosInstance from '@core/api/axios';

export const posApi = {
    lookupCustomer: (data) => axiosInstance.post('/pos/customer/lookup', data),
    createOrder: (data) => axiosInstance.post('/pos/order', data),
    getOrders: (params) => axiosInstance.get('/pos/orders', { params }),
    getOrderDetail: (id) => axiosInstance.get(`/pos/orders/${id}`),
    searchProducts: (params) => axiosInstance.get('/pos/products', { params }),
    getStats: () => axiosInstance.get('/pos/stats'),
};
