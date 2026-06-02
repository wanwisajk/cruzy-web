import { request } from '../../../lib/api';

export const branchesApi = {
  getBranches: () => request('/branches'),
  getRegions: () => request('/regions'),
  createBranch: (body) => request('/branches', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateBranch: (id, body) => request(`/branches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  deleteBranch: (id) => request(`/branches/${id}`, {
    method: 'DELETE'
  })
};
