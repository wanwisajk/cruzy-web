import { request } from '../../../lib/api';

export const employeesApi = {
  createEmployee: (body) => request('/employees', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateEmployee: (id, body) => request(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  saveWorkRules: (id, body) => request(`/employees/${id}/work-rules`, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  deleteEmployee: (id) => request(`/employees/${id}`, {
    method: 'DELETE'
  })
};
