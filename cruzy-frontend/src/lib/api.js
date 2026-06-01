const configured = window.__APP_CONFIG?.API_URL;
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = configured || (isLocal ? 'http://127.0.0.1:5000/api' : '/api');

async function request(path, options = {}) {
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
  })
};
