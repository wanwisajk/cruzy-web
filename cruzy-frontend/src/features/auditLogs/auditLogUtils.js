export const ACTION_CONFIG = {
  CREATE: { label: 'สร้าง', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  UPDATE: { label: 'แก้ไข', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  APPROVE: { label: 'อนุมัติ', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  REJECT: { label: 'ปฏิเสธ', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  DELETE: { label: 'ลบ', className: 'bg-red-50 text-red-700 ring-red-100' },
  EDIT: { label: 'แก้ไข', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  INFO: { label: 'ข้อมูล', className: 'bg-slate-50 text-slate-700 ring-slate-100' }
};

export const SOURCE_CONFIG = {
  audit: 'Audit',
  dashboard: 'Dashboard',
  db_trigger: 'DB Trigger',
  inspection: 'Inspection',
  sales: 'Sales',
  liff: 'LIFF',
  api: 'API'
};

export const TABLE_LABELS = {
  schedules: 'ตารางงาน',
  employees: 'พนักงาน',
  employee_pay_profiles: 'ข้อมูลค่าจ้าง',
  warning_letters: 'หนังสือเตือน',
  leaves: 'การลา',
  leave_balances: 'ยอดลาคงเหลือ',
  employee_branch_eligibility: 'สิทธิ์เข้าทำงานสาขา',
  employee_availability_rules: 'กฎเวลาเข้างาน',
  employee_availability_overrides: 'แก้ไขตารางเวลา',
  sales_logs: 'ยอดขาย',
  inspection_logs: 'ตรวจร้าน',
  system_audit_logs: 'ตรวจสอบระบบ'
};

export const MODULE_LABELS = {
  schedules: 'ตารางงาน',
  employees: 'พนักงาน',
  employee_pay_profiles: 'ข้อมูลค่าจ้าง',
  warning_letters: 'หนังสือเตือน',
  leaves: 'การลา',
  leave_balances: 'ยอดลาคงเหลือ',
  employee_branch_eligibility: 'สิทธิ์เข้าทำงานสาขา',
  employee_availability_rules: 'กฎเวลาเข้างาน',
  employee_availability_overrides: 'แก้ไขตารางเวลา',
  sales_logs: 'ยอดขาย',
  inspection_logs: 'ตรวจร้าน',
  system_audit_logs: 'ตรวจสอบระบบ'
};

export function friendlyTableName(tableName) {
  if (!tableName) return '-';
  return TABLE_LABELS[tableName] || tableName;
}

export function friendlyModuleName(rawModule) {
  if (!rawModule) return '-';
  if (MODULE_LABELS[rawModule]) return MODULE_LABELS[rawModule];
  return rawModule;
}

export const SUPPORTED_MODULES = [
  'ตารางงาน',
  'พนักงาน',
  'ค่าคอม',
  'หนังสือเตือน',
  'การลา',
  'กติกาพนักงาน',
  'ยอดขาย',
  'ตรวจร้าน',
  'ระบบ'
];

export const SUPPORTED_TABLES = [
  'schedules',
  'employees',
  'employee_pay_profiles',
  'warning_letters',
  'leaves',
  'leave_balances',
  'employee_branch_eligibility',
  'employee_availability_rules',
  'employee_availability_overrides',
  'sales_logs',
  'inspection_logs',
  'system_audit_logs'
];

export const DEFAULT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];
export const DEFAULT_SOURCES = ['db_trigger', 'dashboard', 'audit', 'sales', 'inspection', 'liff', 'api'];

export function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function normalizeAction(action) {
  return String(action || 'INFO').toUpperCase();
}

export function getActionConfig(action) {
  return ACTION_CONFIG[normalizeAction(action)] || ACTION_CONFIG.INFO;
}

export function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))];
}

export function mergeOptions(defaults, values) {
  return [...new Set([...defaults, ...values].filter(Boolean))];
}

export function stringifyValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function hasObjectValue(value) {
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}
