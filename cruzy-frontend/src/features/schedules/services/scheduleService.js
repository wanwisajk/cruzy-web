import { request } from '../../../lib/api.js';

export const scheduleService = {
  getScheduleMap: () => request('/schedule'),
  getSchedules: () => request('/schedule/rows'),
  createSchedule: (body) => request('/schedule', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  updateSchedule: (id, body) => request(`/schedule/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  deleteSchedule: (id) => request(`/schedule/${id}`, {
    method: 'DELETE'
  }),
  assignSchedule: (body) => request('/schedule/assign', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  removeSchedule: (body) => request('/schedule/remove', {
    method: 'POST',
    body: JSON.stringify(body)
  })
};
