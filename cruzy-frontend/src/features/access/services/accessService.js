import { request } from '../../../lib/api.js';

export const accessService = {
  getAccessData: () => request('/access'),
  getUsers: () => request('/access/users')
};
