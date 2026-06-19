import { request } from '../../../lib/api.js';

export const accessService = {
  getAccessData: () => request('/access'),
  getUsers: () => request('/access/users')
};

export const accessMutations = {
  createUser: (body) => request('/access/users', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateUser: (id, body) => request(`/access/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  deleteUser: (id) => request(`/access/users/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
};
