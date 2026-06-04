const configured = window.__APP_CONFIG?.API_URL;
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = configured || (isLocal ? 'http://127.0.0.1:5000/api' : '/api');

export async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || 'Request failed');
  }
  return payload;
}

export const api = {
  login: (username, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  consoleData: () => request('/console/data'),
  
  // Inspection
  getInspectionDetail: (id) => request(`/store-inspections/${id}`),
  updateInspection: (id, body) => request(`/store-inspections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  getInspectionSettings: () => request('/inspection-settings'),
  upsertInspectionSetting: (body) => request('/inspection-settings', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  getInspectionLogs: () => request('/inspection-logs'),
  createInspectionLog: (body) => request('/inspection-logs', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  
  // Employees
  createEmployee: (body) => request('/employees', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateEmployee: (id, body) => request(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  
  // Branches
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
  }),
  
  // Schedule
  assignSchedule: (body) => request('/schedule/assign', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  removeSchedule: (body) => request('/schedule/remove', {
    method: 'POST',
    body: JSON.stringify(body)
  }),

  // Sales
  getSales: () => request('/sales'),
  createSale: (body) => request('/sales', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateSale: (id, body) => request(`/sales/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  
  // Bank Accounts
  getBankAccounts: () => request('/bank-accounts'),
  createBankAccount: (body) => request('/bank-accounts', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateBankAccount: (id, body) => request(`/bank-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  
  // Cash Deposits
  getCashDeposits: () => request('/cash-deposits'),
  createCashDeposit: (body) => request('/cash-deposits', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateCashDeposit: (id, body) => request(`/cash-deposits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),

  // Attachments
  getAttachments: () => request('/attachments'),
  createAttachment: (body) => request('/attachments', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  createAttachments: (attachments) => request('/attachments/bulk', {
    method: 'POST',
    body: JSON.stringify({ attachments })
  }),
  deleteAttachment: (id) => request(`/attachments/${id}`, {
    method: 'DELETE'
  })
};
