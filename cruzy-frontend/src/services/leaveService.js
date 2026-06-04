import { request } from '../lib/api.js';

export const leaveService = {
  getLeaves: () => request('/leaves'),
  createLeave: (body) => request('/leaves', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateLeave: (id, body) => request(`/leaves/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  deleteLeave: (id) => request(`/leaves/${id}`, {
    method: 'DELETE'
  })
};
