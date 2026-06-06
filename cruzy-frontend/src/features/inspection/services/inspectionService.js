import { api } from '../../../lib/api.js';

export const inspectionService = {
  fetchConsoleData: async () => {
    return api.consoleData();
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

  getAttachments: async () => {
    return api.getAttachments();
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
