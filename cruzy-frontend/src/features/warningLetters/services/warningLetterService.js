import { request } from '../../../lib/api.js';

export const warningLetterService = {
  getWarningLetters: () => request('/warning-letters'),
  getWarningLetter: (id) => request(`/warning-letters/${id}`),
  createWarningLetter: (body) => request('/warning-letters', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateWarningLetter: (id, body) => request(`/warning-letters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  deleteWarningLetter: (id) => request(`/warning-letters/${id}`, {
    method: 'DELETE'
  })
};
