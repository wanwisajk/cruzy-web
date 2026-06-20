import { request } from '../../../lib/api.js';

export const alertService = {
  getAlerts: (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    const suffix = query.toString();
    return request(`/attendance-alerts${suffix ? `?${suffix}` : ''}`);
  },
  getAlert: (id) => request(`/attendance-alerts/${id}`),
  createAlert: (body) => request('/attendance-alerts', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateAlert: (id, body) => request(`/attendance-alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  acknowledgeAlert: (id) => request(`/attendance-alerts/${id}/ack`, {
    method: 'PATCH'
  }),
  deleteAlert: (id) => request(`/attendance-alerts/${id}`, {
    method: 'DELETE'
  })
};
