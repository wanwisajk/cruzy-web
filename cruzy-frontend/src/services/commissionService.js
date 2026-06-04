import { api } from '../lib/api';

export const commissionService = {
  // Fetch consolidated console data (employees, branches, sales)
  fetchConsoleData: async () => {
    return api.consoleData();
  },
  // Optional lower-level sales fetch
  fetchSales: async () => {
    return api.getSales();
  }
};
