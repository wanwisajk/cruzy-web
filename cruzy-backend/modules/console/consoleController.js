const { applyQueryOptions, fetchOptionalTable, fetchTable, MISSING_TABLE_CODES, supabase } = require('../../shared/db');
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
  'attachments',
  'bankAccountBranches',
  'systemAuditLogs',
  'salarySummaries'
];

const DATE_FILTERS = {
  schedules: 'work_date',
  leaves: 'start_date',
  contracts: 'start_date',
  sales: 'sell_date',
  cashDeposits: 'deposit_date',
  attendance: 'work_date',
  attendanceAlerts: 'work_date',
  storeInspections: 'work_date',
  warningLetters: 'issue_date',
  salarySummaries: 'salary_month'
};

const DEFAULT_OPTIONS = {
  schedules: { order: [{ column: 'work_date', ascending: false }, { column: 'branch_id', ascending: true }] },
  leaves: { order: [{ column: 'status', ascending: true }, { column: 'start_date', ascending: false }] },
  contracts: { order: [{ column: 'start_date', ascending: false }] },
  sales: { order: [{ column: 'sell_date', ascending: false }, { column: 'branch_id', ascending: true }] },
  salesLogs: { order: { column: 'created_at', ascending: false }, limit: 500 },
  cashDeposits: { order: [{ column: 'deposit_date', ascending: false }, { column: 'branch_id', ascending: true }] },
  attendance: { order: [{ column: 'work_date', ascending: false }, { column: 'branch_id', ascending: true }] },
  attendanceAlerts: { order: [{ column: 'is_acknowledged', ascending: true }, { column: 'work_date', ascending: false }] },
  storeInspections: { order: [{ column: 'work_date', ascending: false }, { column: 'branch_id', ascending: true }] },
  inspectionLogs: { order: { column: 'created_at', ascending: false }, limit: 500 },
  attachments: { order: { column: 'created_at', ascending: false } },
  systemAuditLogs: { order: { column: 'created_at', ascending: false }, limit: 1000 },
  salarySummaries: { order: [{ column: 'salary_month', ascending: false }, { column: 'employee_id', ascending: true }] },
  warningLetters: { order: [{ column: 'issue_date', ascending: false }, { column: 'employee_id', ascending: true }] },
  bankAccounts: { order: [{ column: 'is_active', ascending: false }, { column: 'bank_short', ascending: true }] },
  bankAccountBranches: { order: [{ column: 'bank_account_id', ascending: true }, { column: 'branch_id', ascending: true }] }
};

function selectedEntries(keys) {
  const allEntries = Object.entries(TABLES);
  if (!keys) return allEntries;
  const requested = String(keys)
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  if (!requested.length) return allEntries;
  const allowed = new Set(requested);
  return allEntries.filter(([key]) => allowed.has(key));
}

async function fetchConsoleTable({ key, table, select, fromDate, toDate }) {
  let query = supabase.from(table).select(select);
  const dateColumn = DATE_FILTERS[key];
  if (dateColumn && fromDate) query = query.gte(dateColumn, fromDate);
  if (dateColumn && toDate) query = query.lte(dateColumn, toDate);
  query = applyQueryOptions(query, DEFAULT_OPTIONS[key]);
  const { data, error } = await query;
  if (error) {
    if (OPTIONAL_KEYS.includes(key) && (MISSING_TABLE_CODES.includes(error.code) || String(error.message || '').includes('does not exist'))) {
      console.warn(`optional table skipped: ${table}`);
      return [];
    }
    throw error;
  }
  return data || [];
}

exports.getConsoleData = async (req, res) => {
  try {
    const fromDate = req.query.from || req.query.from_date;
    const toDate = req.query.to || req.query.to_date;
    const entries = selectedEntries(req.query.keys || req.query.tables);
    const rows = await Promise.all(entries.map(([key, table]) => {
      const select = key === 'users'
        ? 'id, username, name, role, scope_type, scope_value, created_at'
        : '*';
      if (fromDate || toDate || DEFAULT_OPTIONS[key]) {
        return fetchConsoleTable({ key, table, select, fromDate, toDate });
      }
      return OPTIONAL_KEYS.includes(key)
        ? fetchOptionalTable(table, select)
        : fetchTable(table, select);
    }));

    const payload = Object.fromEntries(entries.map(([key], index) => [key, rows[index]]));
    if (payload.users) payload.users = payload.users.map(normalizeUser);
    res.json(payload);
  } catch (error) {
    console.error('console data failed:', error);
    sendError(res, error, 'ไม่สามารถดึงข้อมูล Console ได้');
  }
};
