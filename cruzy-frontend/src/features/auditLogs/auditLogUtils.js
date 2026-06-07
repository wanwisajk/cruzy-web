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

export function hasObjectValue(value) {
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

const FIELD_LABELS = {
  name: 'ชื่อ',
  nickname: 'ชื่อเล่น',
  phone: 'เบอร์โทร',
  position: 'ตำแหน่ง',
  pos: 'ตำแหน่ง',
  emp_type: 'ประเภทพนักงาน',
  empType: 'ประเภทพนักงาน',
  employee_id: 'พนักงาน',
  branch_id: 'สาขา',
  work_date: 'วันที่ทำงาน',
  start_date: 'วันที่เริ่ม',
  end_date: 'วันที่สิ้นสุด',
  leave_type: 'ประเภทการลา',
  reason: 'เหตุผล',
  status: 'สถานะ',
  level: 'ระดับ',
  issue_date: 'วันที่ออกเอกสาร',
  contract_type: 'ประเภทสัญญา',
  pay_type: 'รูปแบบค่าจ้าง',
  pay_cycle: 'รอบจ่าย',
  wage: 'ค่าแรง',
  salary: 'เงินเดือน',
  monthly_salary: 'เงินเดือน',
  daily_rate: 'ค่าแรงรายวัน',
  commission_type: 'รูปแบบค่าคอม',
  commission_percent: 'เปอร์เซ็นต์ค่าคอม',
  special_allowance: 'เบี้ยพิเศษ'
};

const TABLE_NOUNS = {
  schedules: 'ตารางงาน',
  employees: 'พนักงาน',
  employee_pay_profiles: 'ข้อมูลค่าคอม',
  warning_letters: 'หนังสือเตือน',
  leaves: 'รายการลา',
  leave_balances: 'ยอดลาคงเหลือ',
  employee_branch_eligibility: 'สิทธิ์ลงสาขา',
  employee_availability_rules: 'กติกาเวลาทำงาน',
  employee_availability_overrides: 'การแก้ไขเวลาทำงานเฉพาะวัน',
  sales_logs: 'ยอดขาย',
  inspection_logs: 'รายการตรวจร้าน',
  system_audit_logs: 'บันทึกระบบ'
};

const HIDDEN_CHANGE_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'audit_actor_type',
  'audit_actor_id',
  'audit_actor_name'
]);

function fieldLabel(key) {
  return FIELD_LABELS[key] || key.replaceAll('_', ' ');
}

function pickName(row) {
  if (!hasObjectValue(row)) return '';
  return row.name || row.employee_name || row.nickname || row.title || '';
}

function pickEmployeeId(row) {
  if (!hasObjectValue(row)) return '';
  return row.employee_id || row.employeeId || row.emp_id || row.empId || '';
}

function employeePhrase(log, employeeId) {
  if (log.employee_name) return `พนักงาน ${log.employee_name}`;
  return employeeId ? `พนักงาน #${employeeId}` : 'พนักงาน';
}

function entityPhrase(log) {
  const newValue = hasObjectValue(log.new_value) ? log.new_value : {};
  const oldValue = hasObjectValue(log.old_value) ? log.old_value : {};
  const row = Object.keys(newValue).length ? newValue : oldValue;
  const table = log.table_name;
  const noun = TABLE_NOUNS[table] || friendlyTableName(table) || log.module || 'รายการ';
  const name = pickName(row) || pickName(log);
  const employeeId = log.employee_id || pickEmployeeId(row);
  const employeeText = employeePhrase(log, employeeId);

  if (table === 'employees') return log.employee_name ? `พนักงาน ${log.employee_name}` : (name ? `พนักงานชื่อ ${name}` : employeeText);
  if (table === 'employee_pay_profiles') {
    return `ข้อมูลค่าคอมของ${employeeText}`;
  }
  if (table === 'schedules') {
    const date = row.work_date || row.date;
    return date ? `ตารางงานวันที่ ${date} ของ${employeeText}` : `ตารางงานของ${employeeText}`;
  }
  if (table === 'leaves') {
    const leaveType = row.leave_type || '';
    return `รายการลา${leaveType ? `ประเภท${leaveType}` : ''}ของ${employeeText}`;
  }
  if (table === 'warning_letters') {
    return `หนังสือเตือนของ${employeeText}`;
  }
  if (table === 'leave_balances') return `ยอดลาคงเหลือของ${employeeText}`;
  if (table?.startsWith('employee_')) return `${noun}ของ${employeeText}`;
  if (name) return `${noun} ${name}`;
  if (log.entity_name && !/^CREATE |^UPDATE |^DELETE /i.test(log.entity_name)) return log.entity_name;
  if (log.record_id) return `${noun} #${log.record_id}`;
  return noun;
}

export function changedFieldLabels(log, limit = 4) {
  const oldValue = hasObjectValue(log.old_value) ? log.old_value : {};
  const newValue = hasObjectValue(log.new_value) ? log.new_value : {};
  const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])]
    .filter((key) => !key.startsWith('audit_'))
    .filter((key) => !HIDDEN_CHANGE_FIELDS.has(key))
    .filter((key) => !key.endsWith('_id'))
    .map(fieldLabel);

  return {
    visible: keys.slice(0, limit),
    extraCount: Math.max(0, keys.length - limit),
    total: keys.length
  };
}

export function auditLogSentence(log) {
  const action = normalizeAction(log.action);
  const actor = log.user_name && log.user_name !== 'system' ? `คุณ ${log.user_name}` : 'ระบบ';
  const target = entityPhrase(log);
  const fields = changedFieldLabels(log);

  if (action === 'CREATE' && log.table_name === 'employees') return `${actor} เพิ่ม${target.replace('พนักงานชื่อ', 'พนักงานใหม่ชื่อ')}`;
  if (action === 'CREATE') return `${actor} เพิ่ม${target}`;
  if (action === 'DELETE') return `${actor} ลบ${target}`;
  if (action === 'APPROVE') return `${actor} อนุมัติ${target}`;
  if (action === 'REJECT') return `${actor} ปฏิเสธ${target}`;
  if (action === 'UPDATE' || action === 'EDIT') {
    const changedText = fields.total
      ? ` โดยเปลี่ยน ${fields.visible.join(', ')}${fields.extraCount ? ` และอีก ${fields.extraCount} รายการ` : ''}`
      : '';
    return `${actor} แก้ไข${target}${changedText}`;
  }

  if (log.description && !/^(CREATE|UPDATE|DELETE|APPROVE|REJECT)\b/i.test(log.description)) {
    return `${actor} ${log.description}`;
  }
  return `${actor} มีการบันทึกกิจกรรมใน${target}`;
}
