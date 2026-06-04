import { api } from '../../../lib/api';

export const salesDashboardService = {
  getConsoleData: () => api.consoleData(),
  createSale: (body) => api.createSale(body),
  updateSale: (id, body) => api.updateSale(id, body),
  createCashDeposit: (body) => api.createCashDeposit(body),
  updateCashDeposit: (id, body) => api.updateCashDeposit(id, body),
  createBankAccount: (body) => api.createBankAccount(body),
  updateBankAccount: (id, body) => api.updateBankAccount(id, body),
  createAttachments: (attachments) => api.createAttachments(attachments)
};
