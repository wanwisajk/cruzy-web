import { request } from '../../../lib/api.js';

export const auditLogService = {
  getAuditLogs: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.action) params.append('action', filters.action);
    if (filters.table_name) params.append('table_name', filters.table_name);
    if (filters.search) params.append('search', filters.search);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/audit-logs${query}`);
  },
  getAuditLog: (id) => request(`/audit-logs/${id}`),
  createAuditLog: (body) => request('/audit-logs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
};
