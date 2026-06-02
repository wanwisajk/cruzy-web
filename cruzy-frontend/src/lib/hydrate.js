import { fmtDate, formatDbTime } from './date';

const emptyData = {
  regions: {},
  branches: [],
  employees: [],
  schedule: {},
  leaves: [],
  leaveBalances: {},
  contracts: [],
  branchQuota: {},
  employeeBranches: {},
  employeeBranchRules: [],
  employeeAvailabilityRules: [],
  employeeAvailabilityOverrides: [],
  employeePayProfiles: [],
  branchStaffingRules: [],
  sales: [],
  salesLogs: [],
  attachments: [],
  bankAccounts: [],
  deposits: [],
  attendance: [],
  lineGroups: [],
  users: [],
  storeOpenings: [],
  inspections: [],
  auditLogs: [],
  attendanceAlerts: [],
  warningLetterTemplates: [],
  warningLetters: [],
  initialDate: fmtDate(new Date()),
  initialDateTo: fmtDate(new Date())
};

export function hydrateConsoleData(data = {}) {
  const state = structuredClone(emptyData);
  const regionRows = data.regions || [];
  const branchRows = data.branches || [];
  const empRows = data.employees || [];
  const scheduleRows = data.schedules || [];
  const branchRules = (data.employeeBranchEligibility || data.employee_branch_eligibility || []).map(mapEmployeeBranchRule);
  const staffingRules = (data.branchStaffingRules || data.branch_staffing_rules || []).map(mapStaffingRule);

  regionRows.forEach((r) => {
    state.regions[r.id] = { name: r.name, branches: [] };
  });

  state.branches = branchRows.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    region: b.region_id || b.region || 'default'
  }));
  state.branches.forEach((branch) => {
    if (!state.regions[branch.region]) state.regions[branch.region] = { name: branch.region, branches: [] };
    state.regions[branch.region].branches.push(branch.id);
  });

  state.employeeBranchRules = branchRules;
  state.employeeAvailabilityRules = (data.employeeAvailabilityRules || data.employee_availability_rules || []).map(mapAvailabilityRule);
  state.employeeAvailabilityOverrides = (data.employeeAvailabilityOverrides || data.employee_availability_overrides || []).map(mapAvailabilityOverride);
  state.employeePayProfiles = (data.employeePayProfiles || data.employee_pay_profiles || []).map(mapPayProfile);
  state.branchStaffingRules = staffingRules;

  const primaryBranches = derivePrimaryEmployeeBranches(branchRules, scheduleRows);
  state.employees = empRows.map((employee) => {
    const fallbackBranch = branchRows.find((b) => b.region_id === (employee.region_id || state.branches[0]?.region))?.id || state.branches[0]?.id || '';
    const pay = getPayProfile(employee.id, data.employeePayProfiles || data.employee_pay_profiles || [], employee.salary);
    return {
      id: employee.id,
      name: employee.name,
      nickname: employee.nickname,
      code: employee.id,
      color: employee.color || '#4CAF50',
      branch: primaryBranches[employee.id] || employee.branch_id || fallbackBranch,
      position: employee.position || 'พนักงานขาย',
      salary: Number(employee.salary || pay.monthlySalary || 0),
      region: employee.region_id || '',
      payType: pay.payType,
      dailyRate: pay.dailyRate,
      monthlySalary: pay.monthlySalary,
      commissionEnabled: pay.commissionEnabled
    };
  });

  scheduleRows.forEach((row) => {
    const key = `${row.branch_id}_${row.work_date}`;
    if (!state.schedule[key]) state.schedule[key] = [];
    state.schedule[key].push(row.employee_id);
  });

  state.branchQuota = deriveBranchQuota(state.branches, state.schedule, staffingRules);
  state.employeeBranches = deriveEmployeeBranches(state.employees, branchRules, state.schedule);
  state.leaves = (data.leaves || []).map((leave) => ({
    id: String(leave.id),
    empId: leave.employee_id,
    type: leave.leave_type || 'ลา',
    from: leave.start_date,
    to: leave.end_date,
    days: Number(leave.days_count || 1),
    status: leave.status || 'pending',
    reason: leave.reason || ''
  }));
  state.contracts = (data.contracts || []).map((contract) => ({
    id: String(contract.id),
    empId: contract.employee_id,
    type: contract.contract_type || contract.type || 'ประจำ',
    label: contract.label || contract.contract_type || 'สัญญาจ้าง',
    start: contract.start_date,
    end: contract.end_date,
    file: contract.file_url || ''
  }));
  state.salesLogs = (data.salesLogs || []).map(mapSalesLogRow);
  state.attachments = (data.attachments || []).map(mapAttachmentRow);
  state.sales = (data.sales || []).map((row) => mapSaleRow(row, state.salesLogs, state.attachments));
  state.bankAccounts = (data.bankAccounts || []).map((bank) => ({
    id: bank.id,
    bank: bank.bank_name,
    bankShort: bank.bank_short,
    color: bank.color_code || '#138F2D',
    accNo: bank.account_no,
    accName: bank.account_name,
    type: bank.account_type || 'ออมทรัพย์',
    active: bank.is_active !== false
  }));
  state.deposits = (data.cashDeposits || []).map((row) => mapDepositRow(row, state.attachments));
  state.attendance = (data.attendance || []).map((row) => ({
    id: String(row.id),
    empId: row.employee_id,
    date: row.work_date,
    clockIn: formatDbTime(row.clock_in),
    clockOut: formatDbTime(row.clock_out),
    lateMin: Number(row.late_minutes || 0),
    branch: row.branch_id
  }));
  state.attendanceAlerts = (data.attendanceAlerts || []).map((alert) => ({
    id: String(alert.id),
    type: alert.alert_type,
    empId: alert.employee_id,
    date: alert.work_date,
    branch: alert.branch_id,
    title: alert.title,
    detail: alert.detail || '',
    severity: alert.severity || 'warning',
    time: formatDbTime(alert.created_at) || '',
    ack: Boolean(alert.is_acknowledged)
  }));
  state.inspections = (data.storeInspections || []).map((inspection) => ({
    id: String(inspection.id),
    date: inspection.work_date,
    bid: inspection.branch_id,
    submittedBy: inspection.submitted_by,
    submitTime: formatDbTime(inspection.submit_time),
    status: inspection.status || 'pass',
    note: inspection.manager_note || ''
  }));
  state.warningLetterTemplates = (data.warningLetterTemplates || []).map((template) => ({
    id: template.id,
    level: template.level,
    name: template.name,
    desc: template.description || '',
    body: template.body_template || ''
  }));
  state.warningLetters = (data.warningLetters || []).map((letter) => ({
    id: String(letter.id),
    empId: letter.employee_id,
    templateId: letter.template_id,
    level: letter.level,
    date: letter.issue_date,
    reason: letter.reason,
    branch: letter.branch_id,
    issuedBy: letter.issued_by,
    status: letter.status || 'draft'
  }));
  state.users = (data.users || []).map((user) => ({
    username: user.username,
    name: user.name,
    role: user.role,
    scope: user.scope || user.scope_value || user.scopeType || user.scope_type,
    label: user.label || user.role
  }));
  state.auditLogs = buildAuditLogs(state.sales, state.inspections, state.deposits);
  state.lineGroups = buildLineGroups(state.regions, state.employees);
  setDateRange(state, { scheduleRows, salesRows: data.sales || [], depositRows: data.cashDeposits || [], attendanceRows: data.attendance || [], inspectionRows: data.storeInspections || [], warningRows: data.warningLetters || [], leaveRows: data.leaves || [] });
  return state;
}

function derivePrimaryEmployeeBranches(branchRules, scheduleRows) {
  const byEmployee = {};
  branchRules.filter((rule) => rule.canWork).sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred) || b.priority - a.priority).forEach((rule) => {
    if (!byEmployee[rule.empId]) byEmployee[rule.empId] = rule.branchId;
  });
  scheduleRows.slice().sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))).forEach((schedule) => {
    if (!byEmployee[schedule.employee_id]) byEmployee[schedule.employee_id] = schedule.branch_id;
  });
  return byEmployee;
}

function deriveBranchQuota(branches, schedule, staffingRules) {
  const quota = {};
  branches.forEach((branch) => {
    const rules = staffingRules.filter((rule) => rule.branchId === branch.id && rule.active);
    if (rules.length) {
      quota[branch.id] = {
        weekday: Math.max(1, ...rules.filter((rule) => rule.dayOfWeek >= 1 && rule.dayOfWeek <= 5).map((rule) => rule.requiredStaff)),
        weekend: Math.max(1, ...rules.filter((rule) => rule.dayOfWeek === 0 || rule.dayOfWeek === 6).map((rule) => rule.requiredStaff))
      };
      return;
    }
    const counts = Object.entries(schedule).filter(([key]) => key.startsWith(`${branch.id}_`)).map(([, employees]) => employees.length);
    const maxCount = counts.length ? Math.max(...counts) : 1;
    quota[branch.id] = { weekday: Math.max(1, maxCount), weekend: Math.max(1, Math.min(maxCount, 1)) };
  });
  return quota;
}

function deriveEmployeeBranches(employees, branchRules, schedule) {
  const byEmployee = {};
  branchRules.filter((rule) => rule.canWork).forEach((rule) => {
    if (!byEmployee[rule.empId]) byEmployee[rule.empId] = [];
    if (rule.branchId && !byEmployee[rule.empId].includes(rule.branchId)) byEmployee[rule.empId].push(rule.branchId);
  });
  employees.forEach((employee) => {
    if (!byEmployee[employee.id]) byEmployee[employee.id] = [employee.branch].filter(Boolean);
  });
  Object.entries(schedule).forEach(([key, employeesInShift]) => {
    const branchId = key.split('_')[0];
    employeesInShift.forEach((empId) => {
      if (!byEmployee[empId]) byEmployee[empId] = [];
      if (branchId && !byEmployee[empId].includes(branchId)) byEmployee[empId].push(branchId);
    });
  });
  return byEmployee;
}

function mapEmployeeBranchRule(row) {
  return { id: String(row.id || ''), empId: row.employee_id, branchId: row.branch_id, canWork: row.can_work !== false, isPreferred: Boolean(row.is_preferred), priority: Number(row.priority || 0), commissionEligible: row.commission_eligible !== false, note: row.note || '' };
}

function mapAvailabilityRule(row) {
  return { id: String(row.id || ''), empId: row.employee_id, dayOfWeek: Number(row.day_of_week), type: row.availability_type || 'available', start: formatDbTime(row.start_time), end: formatDbTime(row.end_time), note: row.note || '' };
}

function mapAvailabilityOverride(row) {
  return { id: String(row.id || ''), empId: row.employee_id, date: row.work_date, type: row.availability_type || 'available', start: formatDbTime(row.start_time), end: formatDbTime(row.end_time), reason: row.reason || '' };
}

function mapPayProfile(row) {
  return { id: String(row.id || ''), empId: row.employee_id, payType: row.pay_type || 'monthly', monthlySalary: Number(row.monthly_salary || 0), dailyRate: Number(row.daily_rate || 0), commissionEnabled: row.commission_enabled !== false, effectiveFrom: row.effective_from, effectiveTo: row.effective_to, active: row.is_active !== false };
}

function mapStaffingRule(row) {
  return { id: String(row.id || ''), branchId: row.branch_id, dayOfWeek: Number(row.day_of_week), requiredStaff: Number(row.required_staff || 1), shiftStart: formatDbTime(row.shift_start), shiftEnd: formatDbTime(row.shift_end), active: row.is_active !== false };
}

function getPayProfile(empId, rows, legacySalary) {
  const active = (rows || []).filter((row) => row.employee_id === empId && row.is_active !== false).sort((a, b) => String(b.effective_from || '').localeCompare(String(a.effective_from || '')))[0];
  if (active) return { payType: active.pay_type || 'monthly', monthlySalary: Number(active.monthly_salary || 0), dailyRate: Number(active.daily_rate || 0), commissionEnabled: active.commission_enabled !== false };
  return { payType: 'monthly', monthlySalary: Number(legacySalary || 0), dailyRate: 0, commissionEnabled: true };
}

function mapSaleRow(row, salesLogs = [], attachments = []) {
  const id = String(row.id);
  return {
    id,
    date: row.sell_date || row.date,
    bid: row.branch_id,
    total: Number(row.total_amount || 0),
    cash: Number(row.cash_amount || 0),
    transfer: Number(row.transfer_amount || 0),
    credit: Number(row.credit_amount || 0),
    qr: Number(row.qr_amount || 0),
    orders: Number(row.orders_count || 0),
    submittedBy: row.submitted_by || null,
    submitTime: formatDbTime(row.submitted_at),
    confirmedBy: row.confirmed_by || null,
    confirmTime: formatDbTime(row.confirmed_at),
    status: row.status || 'confirmed',
    rawText: row.raw_text || '',
    editLog: salesLogs.filter((log) => log.saleId === id),
    attachments: attachments.filter((file) => file.entityType === 'sale' && String(file.entityId) === id)
  };
}

function mapDepositRow(row, attachments = []) {
  const id = String(row.id);
  const files = attachments.filter((file) => file.entityType === 'cash_deposit' && String(file.entityId) === id);
  return { id, date: row.deposit_date || row.date, bid: row.branch_id, expected: Number(row.expected_amount || 0), deposited: Number(row.deposited_amount || 0), slip: Boolean(row.slip_url || files.length), slipUrl: row.slip_url || files[0]?.fileUrl || '', attachments: files, bankAccId: row.bank_account_id || null, depositedBy: row.deposited_by || null, verifiedBy: row.verified_by || null, verifyTime: formatDbTime(row.verified_at), status: row.status || 'waiting' };
}

function mapSalesLogRow(row) {
  return {
    id: String(row.id),
    saleId: String(row.sale_id),
    time: formatDbTime(row.created_at),
    by: row.edited_by || null,
    field: row.field_name,
    from: row.old_value,
    to: row.new_value,
    reason: row.reason || ''
  };
}

function mapAttachmentRow(row) {
  return {
    id: String(row.id),
    entityType: row.entity_type,
    entityId: String(row.entity_id),
    fileUrl: row.file_url,
    createdAt: row.created_at || null
  };
}

function buildAuditLogs(sales, inspections, deposits) {
  return [
    ...inspections.map((inspection) => ({ id: `inspection_${inspection.id}`, timestamp: `${inspection.date}T${inspection.submitTime || '00:00'}`, action: 'create', tableName: 'inspection', branchId: inspection.bid })),
    ...deposits.filter((deposit) => deposit.status === 'verified').map((deposit) => ({ id: `deposit_${deposit.id}`, timestamp: `${deposit.date}T00:00`, action: 'verify', tableName: 'deposit', branchId: deposit.bid })),
    ...sales.map((sale) => ({ id: `sale_${sale.id}`, timestamp: `${sale.date}T00:00`, action: sale.status, tableName: 'sales', branchId: sale.bid }))
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function buildLineGroups(regions, employees) {
  return Object.entries(regions).map(([regionId, region]) => ({ name: `Cruzy ${region.name}`, region: regionId, branches: region.branches, members: employees.filter((employee) => region.branches.includes(employee.branch)).map((employee) => employee.id) }));
}

function setDateRange(state, groups) {
  const dates = [];
  groups.scheduleRows.forEach((row) => dates.push(row.work_date));
  groups.salesRows.forEach((row) => dates.push(row.sell_date));
  groups.depositRows.forEach((row) => dates.push(row.deposit_date));
  groups.attendanceRows.forEach((row) => dates.push(row.work_date));
  groups.inspectionRows.forEach((row) => dates.push(row.work_date));
  groups.warningRows.forEach((row) => dates.push(row.issue_date));
  if (!dates.filter(Boolean).length) groups.leaveRows.forEach((row) => dates.push(row.start_date, row.end_date));
  const valid = dates.filter(Boolean).sort();
  if (valid.length) {
    state.initialDate = valid[valid.length - 1];
    state.initialDateTo = state.initialDate;
  }
}
