const { fetchOptionalTable, fetchTable } = require('../../shared/db');
const { sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const { normalizeUser } = require('../../shared/users');

const OPTIONAL_KEYS = [
  'employeeBranchEligibility',
  'employeeAvailabilityRules',
  'employeeAvailabilityOverrides',
  'employeePayProfiles',
  'branchStaffingRules',
  'leaveBalances',
  'salesLogs',
  'attachments'
];

exports.getConsoleData = async (_req, res) => {
  try {
    const entries = Object.entries(TABLES);
    const rows = await Promise.all(entries.map(([key, table]) => {
      const select = key === 'users'
        ? 'id, username, name, role, scope_type, scope_value, created_at'
        : '*';
      return OPTIONAL_KEYS.includes(key)
        ? fetchOptionalTable(table, select)
        : fetchTable(table, select);
    }));

    const payload = Object.fromEntries(entries.map(([key], index) => [key, rows[index]]));
    payload.users = payload.users.map(normalizeUser);
    res.json(payload);
  } catch (error) {
    console.error('console data failed:', error);
    sendError(res, error, 'ไม่สามารถดึงข้อมูล Console ได้');
  }
};
