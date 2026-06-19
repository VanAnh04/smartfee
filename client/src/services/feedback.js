import api from './api';

export const feedbackService = {
  create: (data) => api.post('/feedback', data),
  getMyFeedbacks: (params) => api.get('/feedback/my', { params }),
  getOrganizationFeedbacks: (params) => api.get('/feedback/organization', { params }),
  getAllFeedbacks: (params) => api.get('/feedback/all', { params }),
  getFeedbackStats: () => api.get('/feedback/stats/summary'),
  updateStatus: (id, data) => api.put(`/feedback/${id}/status`, data),
  deleteFeedback: (id) => api.delete(`/feedback/${id}`),
};
