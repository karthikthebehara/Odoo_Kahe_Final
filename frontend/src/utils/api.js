/**
 * frontend/src/utils/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Axios instance pre-configured for the Odoo Cafe POS backend.
 * • baseURL  → http://localhost:5000
 * • Auth     → attaches JWT from localStorage on every request
 * • Response → unwraps { success, data, error } envelope automatically
 * • Errors   → normalises to a plain Error with .message set to server's error
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Request interceptor: attach Bearer token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: unwrap envelope & normalise errors ─────────────────
api.interceptors.response.use(
  (response) => {
    // Server sends: { success: true, data: {...} }
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }
    // Pass through responses that are not enveloped (e.g. health check)
    return payload;
  },
  (error) => {
    // Network-level errors (no response object)
    if (!error.response) {
      return Promise.reject(new Error('Network error — is the backend running?'));
    }

    const serverMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      `Request failed with status ${error.response.status}`;

    // 401 → clear token and redirect to login
    if (error.response.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      window.location.href = '/login';
    }

    const err = new Error(serverMsg);
    err.status = error.response.status;
    err.raw = error.response.data;
    return Promise.reject(err);
  }
);

export default api;

// ── Convenience helpers ───────────────────────────────────────────────────────
export const authAPI = {
  login:  (data) => api.post('/api/auth/login', data),
  signup: (data) => api.post('/api/auth/signup', data),
  me:     ()     => api.get('/api/auth/me'),
};

export const productsAPI = {
  list:   (params) => api.get('/api/products', { params }),
  get:    (id)     => api.get(`/api/products/${id}`),
  create: (data)   => api.post('/api/products', data),
  update: (id, d)  => api.put(`/api/products/${id}`, d),
  delete: (id)     => api.delete(`/api/products/${id}`),
};

export const categoriesAPI = {
  list:   ()       => api.get('/api/categories'),
  create: (data)   => api.post('/api/categories', data),
  update: (id, d)  => api.put(`/api/categories/${id}`, d),
  delete: (id)     => api.delete(`/api/categories/${id}`),
};

export const ordersAPI = {
  list:         (params)       => api.get('/api/orders', { params }),
  get:          (id)           => api.get(`/api/orders/${id}`),
  create:       (data)         => api.post('/api/orders', data),
  update:       (id, d)        => api.put(`/api/orders/${id}`, d),
  updateStatus: (id, status)   => api.put(`/api/orders/${id}/status`, { status }),
  sendToKds:    (id)           => api.post(`/api/orders/${id}/send-kitchen`),
  pay:          (id, d)        => api.post(`/api/orders/${id}/pay`, d),
  cancel:       (id)           => api.post(`/api/orders/${id}/cancel`),
};

export const tablesAPI = {
  list:   ()       => api.get('/api/tables'),
  floors: ()       => api.get('/api/floors'),
  free:   (id)     => api.put(`/api/tables/${id}/free`),
};

export const kdsAPI = {
  list:         (params) => api.get('/api/sync/kds', { params }),
  updateStatus: (orderId, status) => api.put(`/api/orders/${orderId}/kds`, { status }),
  updateItem:   (orderId, itemId, is_item_completed)  => api.put(`/api/orders/${orderId}/items/${itemId}/complete`, { is_item_completed }),
};

export const couponsAPI = {
  validate: (code) => api.post('/api/coupons/validate', { code }),
  list:     ()     => api.get('/api/coupons'),
  create:   (data) => api.post('/api/coupons', data),
  update:   (id, d)=> api.put(`/api/coupons/${id}`, d),
  delete:   (id)   => api.delete(`/api/coupons/${id}`),
};

export const customersAPI = {
  list:   (q)      => api.get('/api/customers', { params: { q } }),
  create: (data)   => api.post('/api/customers', data),
  update: (id, d)  => api.put(`/api/customers/${id}`, d),
  delete: (id)     => api.delete(`/api/customers/${id}`),
};

export const employeesAPI = {
  list:   ()       => api.get('/api/employees'),
  create: (data)   => api.post('/api/employees', data),
  update: (id, d)  => api.put(`/api/employees/${id}`, d),
  delete: (id)     => api.delete(`/api/employees/${id}`),
};

export const paymentMethodsAPI = {
  list:   ()       => api.get('/api/payment-methods'),
  create: (data)   => api.post('/api/payment-methods', data),
  update: (id, d)  => api.put(`/api/payment-methods/${id}`, d),
  delete: (id)     => api.delete(`/api/payment-methods/${id}`),
};

export const sessionsAPI = {
  list: () => api.get('/api/sessions'),
  active: () => api.get('/api/sessions/active'),
  summary: (id) => api.get(`/api/sessions/${id}/summary`),
};

export const reportsAPI = {
  dashboard: (params) => api.get('/api/reports/dashboard', { params }),
};
