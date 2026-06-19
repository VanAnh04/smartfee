import api from './api';

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getOrganizations: (params) => api.get('/admin/organizations', { params }),
  getOrganization: (id) => api.get(`/admin/organizations/${id}`),
  updateOrganization: (id, data) => api.put(`/admin/organizations/${id}`, data),
  createOrganization: (data) => api.post('/admin/organizations', data),
  deleteOrganization: (id) => api.delete(`/admin/organizations/${id}`),
  getOrganizationUsers: (orgId) => api.get(`/admin/organizations/${orgId}/users`),
  createOrganizationUser: (orgId, data) => api.post(`/admin/organizations/${orgId}/users`, data),
  getSuperAdmins: () => api.get('/admin/superadmins'),
  createSuperAdmin: (data) => api.post('/admin/superadmins', data),
  updateSuperAdmin: (id, data) => api.put(`/admin/superadmins/${id}`, data),
  deleteSuperAdmin: (id) => api.delete(`/admin/superadmins/${id}`),
};
