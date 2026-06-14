import { api } from '../../../lib/api';

export const salesDashboardService = {
  getConsoleData: () => api.consoleData(),
  createSale: (body) => api.createSale(body),
  updateSale: (id, body) => api.updateSale(id, body),
  approveSale: (id) => api.approveSale(id),
  rejectSale: (id) => api.rejectSale(id),
  createCashDeposit: (body) => api.createCashDeposit(body),
  updateCashDeposit: (id, body) => api.updateCashDeposit(id, body),
  approveCashDeposit: (id) => api.approveCashDeposit(id),
  rejectCashDeposit: (id) => api.rejectCashDeposit(id),
  createBankAccount: (body) => api.createBankAccount(body),
  updateBankAccount: (id, body) => api.updateBankAccount(id, body),
  createAttachments: (attachments) => api.createAttachments(attachments),
  uploadAttachment: (body) => api.uploadAttachment(body)
};
