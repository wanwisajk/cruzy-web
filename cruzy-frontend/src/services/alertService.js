import { request } from '../lib/api.js';

export const alertService = {
  getAlerts: () => request('/attendance-alerts'),
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
