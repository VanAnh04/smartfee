import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('organization');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password, studentCode) => api.post('/auth/login', { email, password, studentCode }),
  register: (data) => api.post('/auth/register', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  createUserAccounts: (data) => api.post('/auth/create-user-accounts', data),
  getMyChildren: () => api.get('/auth/my-children'),
  getMyFees: () => api.get('/auth/my-fees'),
  // Family account management (admin)
  getFamilyAccounts: (params) => api.get('/auth/family-accounts', { params }),
  getFamilyAccountChildren: (id) => api.get(`/auth/family-accounts/${id}/children`),
  linkStudent: (data) => api.post('/auth/family-accounts/link-student', data),
  unlinkStudent: (data) => api.post('/auth/family-accounts/unlink-student', data),
};

export const studentService = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  import: (students) => api.post('/students/import', { students }),
  getStats: () => api.get('/students/stats/count'),
  searchExisting: (query) => api.get('/students/search-existing', { params: { q: query } }),
  checkDuplicate: (phone) => api.get('/students/check-duplicate', { params: { phone } }),
  transfer: (id, data) => api.put(`/students/${id}/transfer`, data),
  createAccounts: (data) => api.post('/students/create-accounts', data),
};

export const classService = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  addStudent: (classId, studentId) => api.post(`/classes/${classId}/students/${studentId}`),
  removeStudent: (classId, studentId) => api.delete(`/classes/${classId}/students/${studentId}`),
  getStats: () => api.get('/classes/stats/count'),
};

export const feeService = {
  getPeriods: () => api.get('/fees/periods'),
  createPeriod: (data) => api.post('/fees/periods', data),
  updatePeriod: (id, data) => api.put(`/fees/periods/${id}`, data),
  deletePeriod: (id) => api.delete(`/fees/periods/${id}`),
  getAll: (params) => api.get('/fees', { params }),
  getById: (id) => api.get(`/fees/${id}`),
  generate: (data) => api.post('/fees/generate', data),
  bulkUpdate: (fees) => api.post('/fees/bulk-update', { fees }),
  applyDiscount: (id, data) => api.post(`/fees/${id}/discount`, data),
  getStats: () => api.get('/fees/stats/summary'),
  sendReminder: (id) => api.post(`/fees/${id}/remind`),
  sendBulkReminder: (periodId) => api.post(`/fees/periods/${periodId}/remind-all`),
};

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  createQRCode: (data) => api.post('/payments/qr-code', data),
  confirmManual: (data) => api.post('/payments/confirm-manual', data),
  confirmManualWithReceipt: (data) => api.post('/payments/confirm-manual', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadReceipt: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads/receipt', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  approve: (id) => api.post(`/payments/${id}/approve`),
  reject: (id) => api.post(`/payments/${id}/reject`),
  delete: (id) => api.delete(`/payments/${id}`),
  getInvoiceUrl: (paymentId) => `/api/payments/${paymentId}/invoice`,
  walletTopup: (data) => api.post('/payments/wallet/topup', data),
  walletPay: (data) => api.post('/payments/wallet/pay', data),
  getStats: () => api.get('/payments/stats/summary'),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentPayments: (limit) => api.get('/dashboard/recent-payments', { params: { limit } }),
  getTopDebtors: (limit) => api.get('/dashboard/top-debtors', { params: { limit } }),
  getRevenueChart: (months) => api.get('/dashboard/revenue-chart', { params: { months } }),
  getFeeDistribution: () => api.get('/dashboard/fee-distribution'),
};

export const reportService = {
  getRevenueReport: (params) => api.get('/reports/revenue', { params }),
  getDebtReport: (params) => api.get('/reports/debt', { params }),
  getClassReport: (params) => api.get('/reports/class', { params }),
  getStudentReport: (id) => api.get(`/reports/student/${id}`),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getStaff: () => api.get('/settings/staff'),
  createStaff: (data) => api.post('/settings/staff', data),
  updateStaff: (id, data) => api.put(`/settings/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/settings/staff/${id}`),
  getQRConfig: () => api.get('/settings/qr-config'),
  updateQRConfig: (data) => api.post('/settings/qr-config', data),
  // Support settings
  getSupportSettings: () => api.get('/settings/support'),
  updateSupportSettings: (data) => api.post('/settings/support', data),
  // Plan management
  getUsage: () => api.get('/settings/usage'),
  getPlans: () => api.get('/settings/plans'),
  upgradePlan: (targetPlan, months = 1) => api.post('/settings/upgrade', { targetPlan, months }),
  confirmUpgrade: (orderCode, targetPlan, months) => api.post('/settings/upgrade/confirm', { orderCode, targetPlan, months }),
  cancelPlan: () => api.post('/settings/cancel'),
};

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const organizationService = {
  getAll: (params) => api.get('/admin/organizations', { params }),
  getById: (id) => api.get(`/admin/organizations/${id}`),
  create: (data) => api.post('/admin/organizations', data),
  update: (id, data) => api.put(`/admin/organizations/${id}`, data),
  delete: (id) => api.delete(`/admin/organizations/${id}`),
};

export const attendanceService = {
  getHistory: (params) => api.get('/attendance', { params }),
  getByClassAndDate: (classId, date) => api.get(`/attendance/class/${classId}/date/${date}`),
  save: (data) => api.post('/attendance', data),
  getStudentStats: (studentId) => api.get(`/attendance/student/${studentId}/stats`)
};

export default api;
