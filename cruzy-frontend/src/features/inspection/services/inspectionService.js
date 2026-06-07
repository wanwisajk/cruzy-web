import { api } from '../../../lib/api.js';

export const inspectionService = {
  fetchDashboardData: async (filters) => {
    return api.getInspectionDashboard(filters);
  },

  getInspection: async (id) => {
    return api.getInspectionDetail(id);
  },

  createInspection: async (payload) => {
    return api.createInspection(payload);
  },

  updateInspection: async (id, payload) => {
    return api.updateInspection(id, payload);
  },

  createAttachments: async (attachments) => {
    return api.createAttachments(attachments);
  },

  getAttachments: async (filters) => {
    return api.getAttachments(filters);
  },

  getInspectionSettings: async () => {
    return api.getInspectionSettings();
  },

  upsertInspectionSetting: async (payload) => {
    return api.upsertInspectionSetting(payload);
  },

  getInspectionLogs: async () => {
    return api.getInspectionLogs();
  },

  createInspectionLog: async (payload) => {
    return api.createInspectionLog(payload);
  }
};
