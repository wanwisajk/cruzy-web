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
  salarySummaries: [],
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

const DAY_NUMBER_TO_KEY = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' };
const DEFAULT_BRANCH_HOURS = { จ: '10:00', อ: '10:00', พ: '10:00', พฤ: '10:00', ศ: '10:00', ส: '10:00', อา: '10:00' };
const DEFAULT_BRANCH_CLOSE = { จ: '21:00', อ: '21:00', พ: '21:00', พฤ: '21:00', ศ: '21:00', ส: '21:00', อา: '21:00' };

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

  state.branches = branchRows.map((b) => {
    const branchStaffingRules = staffingRules.filter((rule) => String(rule.branchId) === String(b.id));
    const hours = { ...DEFAULT_BRANCH_HOURS };
    const hoursEnd = { ...DEFAULT_BRANCH_CLOSE };
    let minWeekday = 1;
    let minWeekend = 1;
    branchStaffingRules.forEach((rule) => {
      const dayKey = DAY_NUMBER_TO_KEY[rule.dayOfWeek];
      if (dayKey) {
        hours[dayKey] = rule.shiftStart || hours[dayKey];
        hoursEnd[dayKey] = rule.shiftEnd || hoursEnd[dayKey];
      }
      if (rule.dayOfWeek >= 1 && rule.dayOfWeek <= 5) minWeekday = Math.max(minWeekday, Number(rule.requiredStaff || 1));
      if (rule.dayOfWeek === 0 || rule.dayOfWeek === 6) minWeekend = Math.max(minWeekend, Number(rule.requiredStaff || 1));
    });
    return {
      id: String(b.id),
      name: b.name,
      code: b.code,
      region: String(b.region_id || b.region || 'default'),
      hours,
      hoursEnd,
      minWeekday,
      minWeekend
    };
  });
  state.branches.forEach((branch) => {
    if (!state.regions[branch.region]) state.regions[branch.region] = { name: branch.region, branches: [] };
    state.regions[branch.region].branches.push(branch.id);
  });

  state.employeeBranchRules = branchRules;
  state.employeeAvailabilityRules = (data.employeeAvailabilityRules || data.employee_availability_rules || []).map(mapAvailabilityRule);
  state.employeeAvailabilityOverrides = (data.employeeAvailabilityOverrides || data.employee_availability_overrides || []).map(mapAvailabilityOverride);
  state.employeePayProfiles = (data.employeePayProfiles || data.employee_pay_profiles || []).map(mapPayProfile);
  state.salarySummaries = (data.salarySummaries || data.salary_summaries || []).map(mapSalarySummary);
  state.branchStaffingRules = staffingRules;

  const primaryBranches = derivePrimaryEmployeeBranches(branchRules, scheduleRows);
  state.employees = empRows.map((employee) => {
    const employeeId = String(employee.id);
    const fallbackBranch = branchRows.find((b) => String(b.region_id) === String(employee.region_id || state.branches[0]?.region))?.id || state.branches[0]?.id || '';
    const pay = getPayProfile(employeeId, data.employeePayProfiles || data.employee_pay_profiles || [], employee.salary);
    return {
      id: employeeId,
      name: employee.name,
      nickname: employee.nickname,
      phone: employee.phone || '',
      line_user_id: employee.line_user_id || '',
      lineUserId: employee.line_user_id || '',
      code: employeeId,
      color: employee.color || '#4CAF50',
      branch: String(primaryBranches[employeeId] || employee.branch_id || fallbackBranch),
      position: employee.position || 'พนักงานขาย',
      empType: employee.emp_type || employee.empType || 'fulltime',
      salary: Number(employee.salary || pay.monthlySalary || 0),
      region: String(employee.region_id || ''),
      payType: pay.payType,
      payCycle: pay.payCycle,
      dailyRate: pay.dailyRate,
      monthlySalary: pay.monthlySalary,
      breakHours: pay.breakHours,
      commissionEnabled: pay.commissionEnabled,
      commissionRate: pay.commissionRate,
      commissionCalcType: pay.commissionCalcType,
      commissionBranches: branchRules
        .filter((rule) => rule.empId === employeeId && rule.canWork !== false && rule.commissionEligible !== false)
        .map((rule) => rule.branchId),
      specialAllowance: pay.specialAllowance,
      socialSecurityEnabled: pay.socialSecurityEnabled,
      socialSecurityAmount: pay.socialSecurityAmount,
      absenceDeductMode: pay.absenceDeductMode,
      absenceDeductUnit: pay.absenceDeductUnit,
      absenceDeductValue: pay.absenceDeductValue,
      absenceSystemCalc: pay.absenceSystemCalc,
      startDate: pay.effectiveFrom
    };
  });

  state.leaveBalances = (data.leaveBalances || []).reduce((acc, row) => {
    const annualQuota = Number(row.annual_quota ?? row.annual_remaining ?? 0);
    const vacationQuota = Number(row.vacation_quota ?? row.vacation_remaining ?? 0);
    const personalQuota = Number(row.personal_quota ?? 0);
    const annualRemaining = Number(row.annual_remaining ?? 0);
    const vacationRemaining = Number(row.vacation_remaining ?? 0);
    const annualUsed = Number(row.annual_used ?? (annualQuota - annualRemaining) ?? 0);
    const vacationUsed = Number(row.vacation_used ?? (vacationQuota - vacationRemaining) ?? 0);
    acc[String(row.employee_id)] = {
      annualQuota,
      annualRemaining,
      annualUsed,
      vacationQuota,
      vacationRemaining,
      vacationUsed,
      personalQuota,
      personalUsed: Number(row.personal_used ?? 0),
      sickUsed: Number(row.sick_used ?? 0),
      updatedAt: row.updated_at || null
    };
    return acc;
  }, {});

  scheduleRows.forEach((row) => {
    const key = `${row.branch_id}_${row.work_date}`;
    if (!state.schedule[key]) state.schedule[key] = [];
    const employeeId = String(row.employee_id);
    if (!state.schedule[key].includes(employeeId)) state.schedule[key].push(employeeId);
  });

  state.branchQuota = deriveBranchQuota(state.branches, state.schedule, staffingRules);
  state.employeeBranches = deriveEmployeeBranches(state.employees, branchRules, state.schedule);
  state.contracts = (data.contracts || []).map((contract) => ({
    id: String(contract.id),
    empId: String(contract.employee_id),
    type: contract.contract_type || contract.type || 'ประจำ',
    label: contract.label || contract.contract_type || 'สัญญาจ้าง',
    start: contract.start_date,
    end: contract.end_date,
    file: contract.file_url || ''
  }));
  state.salesLogs = (data.salesLogs || []).map(mapSalesLogRow);
  state.attachments = (data.attachments || []).map(mapAttachmentRow);
  state.leaves = (data.leaves || []).map((leave) => {
    const id = String(leave.id);
    const attachments = state.attachments.filter((file) => file.entityType === 'leave' && String(file.entityId) === id);
    return {
      id,
      empId: String(leave.employee_id),
      type: leave.leave_type || 'ลา',
      from: leave.start_date,
      to: leave.end_date,
      days: Number(leave.days_count || 1),
      status: leave.status || 'pending',
      reason: leave.reason || '',
      attachments
    };
  });
  state.sales = (data.sales || []).map((row) => mapSaleRow(row, state.salesLogs, state.attachments));
  const bankAccountBranches = (data.bankAccountBranches || data.bank_account_branches || []).reduce((map, row) => {
    const key = String(row.bank_account_id ?? row.bankAccountId);
    const current = map.get(key) || [];
    current.push(row.branch_id ?? row.branchId);
    map.set(key, current);
    return map;
  }, new Map());
  state.bankAccounts = (data.bankAccounts || []).map((bank) => {
    const branchIds = bank.branch_ids || bank.branchIds || bankAccountBranches.get(String(bank.id)) || [];
    return {
      id: bank.id,
      bank: bank.bank_name,
      bankShort: bank.bank_short,
      color: bank.color_code || '#138F2D',
      accNo: bank.account_no,
      accName: bank.account_name,
      type: bank.account_type || 'ออมทรัพย์',
      active: bank.is_active !== false,
      branchIds: branchIds.map(String)
    };
  });
  state.deposits = (data.cashDeposits || []).map((row) => mapDepositRow(row, state.attachments));
  state.attendance = (data.attendance || []).map((row) => ({
    id: String(row.id),
    empId: String(row.employee_id),
    date: row.work_date,
    clockIn: formatDbTime(row.clock_in),
    clockOut: formatDbTime(row.clock_out),
    lateMin: Number(row.late_minutes || 0),
    breakStart: formatDbTime(row.break_start),
    breakEnd: formatDbTime(row.break_end),
    breakMinutes: Number(row.break_minutes || 0),
    breakOver: Boolean(row.is_break_over),
    branch: row.branch_id
  }));
  state.attendanceAlerts = (data.attendanceAlerts || []).map((alert) => ({
    id: String(alert.id),
    type: alert.alert_type,
    empId: String(alert.employee_id),
    date: alert.work_date,
    branch: alert.branch_id,
    title: alert.title,
    detail: alert.detail || '',
    severity: alert.severity || 'warning',
    time: formatDbTime(alert.alert_time) || '',
    ack: Boolean(alert.is_acknowledged)
  }));
  state.inspections = (data.storeInspections || []).map((inspection) => ({
    id: String(inspection.id),
    date: inspection.work_date,
    bid: inspection.branch_id,
    submittedBy: inspection.submitted_by === null || inspection.submitted_by === undefined ? null : String(inspection.submitted_by),
    submitTime: formatDbTime(inspection.submit_time),
    closeTime: formatDbTime(inspection.close_time),
    status: inspection.status || 'pass',
    isLate: Boolean(inspection.is_late),
    lateMinutes: Number(inspection.late_minutes || 0),
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
    empId: String(letter.employee_id),
    templateId: letter.template_id,
    level: letter.level,
    date: letter.issue_date,
    reason: letter.reason,
    branch: letter.branch_id,
    issuedBy: letter.issued_by === null || letter.issued_by === undefined ? null : String(letter.issued_by),
    status: letter.status || 'draft'
  }));
  state.users = (data.users || []).map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    scope: user.scope || user.scope_value || user.scopeValue || user.scopeType || user.scope_type,
    scopeType: user.scopeType || user.scope_type || (user.scope === 'all' ? 'all' : undefined),
    scopeValue: user.scopeValue ?? user.scope_value ?? user.scope,
    scope_type: user.scope_type || user.scopeType || (user.scope === 'all' ? 'all' : undefined),
    scope_value: user.scope_value ?? user.scopeValue ?? user.scope,
    created_at: user.created_at || user.createdAt,
    label: user.label || user.role
  }));
  state.auditLogs = buildAuditLogs(state.sales, state.inspections, state.deposits);
  state.lineGroups = buildLineGroups(state.regions, state.employees);
  setDateRange(state, { scheduleRows, salesRows: data.sales || [], depositRows: data.cashDeposits || [], attendanceRows: data.attendance || [], inspectionRows: data.storeInspections || [], warningRows: data.warningLetters || [], leaveRows: data.leaves || [] });
  return state;
}

export function hydrateConsolePatch(data = {}, current = emptyData) {
  const state = structuredClone(current || emptyData);
  Object.entries(emptyData).forEach(([key, value]) => {
    if (state[key] === undefined) state[key] = structuredClone(value);
  });

  const branchRulesRows = readRows(data, 'employeeBranchEligibility', 'employee_branch_eligibility');
  const availabilityRuleRows = readRows(data, 'employeeAvailabilityRules', 'employee_availability_rules');
  const availabilityOverrideRows = readRows(data, 'employeeAvailabilityOverrides', 'employee_availability_overrides');
  const payProfileRows = readRows(data, 'employeePayProfiles', 'employee_pay_profiles');
  const staffingRuleRows = readRows(data, 'branchStaffingRules', 'branch_staffing_rules');
  const bankAccountBranchRows = readRows(data, 'bankAccountBranches', 'bank_account_branches');

  if (hasAny(data, 'regions')) {
    state.regions = {};
    (data.regions || []).forEach((region) => {
      state.regions[String(region.id)] = { name: region.name, branches: [] };
    });
  }
  if (staffingRuleRows) state.branchStaffingRules = staffingRuleRows.map(mapStaffingRule);
  if (hasAny(data, 'branches')) {
    state.branches = mapBranchRows(data.branches || [], state.branchStaffingRules);
  }
  if (hasAny(data, 'regions', 'branches')) rebuildRegionsFromBranches(state);

  if (branchRulesRows) state.employeeBranchRules = branchRulesRows.map(mapEmployeeBranchRule);
  if (availabilityRuleRows) state.employeeAvailabilityRules = availabilityRuleRows.map(mapAvailabilityRule);
  if (availabilityOverrideRows) state.employeeAvailabilityOverrides = availabilityOverrideRows.map(mapAvailabilityOverride);
  if (payProfileRows) state.employeePayProfiles = payProfileRows.map(mapPayProfile);
  if (hasAny(data, 'salarySummaries', 'salary_summaries')) state.salarySummaries = readRows(data, 'salarySummaries', 'salary_summaries').map(mapSalarySummary);

  if (hasAny(data, 'schedules')) {
    state.schedule = buildScheduleMap(data.schedules || []);
  }
  if (hasAny(data, 'employees')) {
    state.employees = mapEmployeeRowsForState(data.employees || [], state, payProfileRows);
  } else if (payProfileRows) {
    state.employees = state.employees.map((employee) => applyMappedPayProfile(employee, state.employeePayProfiles));
  } else if (branchRulesRows) {
    state.employees = state.employees.map((employee) => ({
      ...employee,
      commissionBranches: state.employeeBranchRules
        .filter((rule) => rule.empId === employee.id && rule.canWork !== false && rule.commissionEligible !== false)
        .map((rule) => rule.branchId)
    }));
  }

  if (hasAny(data, 'employees', 'employeeBranchEligibility', 'employee_branch_eligibility', 'schedules')) {
    state.employeeBranches = deriveEmployeeBranches(state.employees, state.employeeBranchRules, state.schedule);
    state.lineGroups = buildLineGroups(state.regions, state.employees);
  }
  if (hasAny(data, 'branches', 'schedules', 'branchStaffingRules', 'branch_staffing_rules')) {
    state.branchQuota = deriveBranchQuota(state.branches, state.schedule, state.branchStaffingRules);
  }

  if (hasAny(data, 'leaveBalances')) state.leaveBalances = mapLeaveBalances(data.leaveBalances || []);
  if (hasAny(data, 'contracts')) {
    state.contracts = (data.contracts || []).map((contract) => ({
      id: String(contract.id),
      empId: String(contract.employee_id),
      type: contract.contract_type || contract.type || 'ประจำ',
      label: contract.label || contract.contract_type || 'สัญญาจ้าง',
      start: contract.start_date,
      end: contract.end_date,
      file: contract.file_url || ''
    }));
  }

  if (hasAny(data, 'attachments')) state.attachments = (data.attachments || []).map(mapAttachmentRow);
  if (hasAny(data, 'leaves')) {
    state.leaves = (data.leaves || []).map((leave) => {
      const id = String(leave.id);
      return {
        id,
        empId: String(leave.employee_id),
        type: leave.leave_type || 'ลา',
        from: leave.start_date,
        to: leave.end_date,
        days: Number(leave.days_count || 1),
        status: leave.status || 'pending',
        reason: leave.reason || '',
        attachments: state.attachments.filter((file) => file.entityType === 'leave' && String(file.entityId) === id)
      };
    });
  } else if (hasAny(data, 'attachments')) {
    state.leaves = state.leaves.map((leave) => ({
      ...leave,
      attachments: state.attachments.filter((file) => file.entityType === 'leave' && String(file.entityId) === String(leave.id))
    }));
  }

  if (hasAny(data, 'salesLogs')) state.salesLogs = (data.salesLogs || []).map(mapSalesLogRow);
  if (hasAny(data, 'sales')) {
    state.sales = (data.sales || []).map((row) => mapSaleRow(row, state.salesLogs, state.attachments));
  } else if (hasAny(data, 'salesLogs', 'attachments')) {
    state.sales = state.sales.map((sale) => ({
      ...sale,
      editLog: state.salesLogs.filter((log) => log.saleId === String(sale.id)),
      attachments: state.attachments.filter((file) => file.entityType === 'sale' && String(file.entityId) === String(sale.id))
    }));
  }

  if (bankAccountBranchRows || hasAny(data, 'bankAccounts')) {
    state.bankAccounts = mapBankAccountRows(
      hasAny(data, 'bankAccounts') ? data.bankAccounts || [] : state.bankAccounts,
      bankAccountBranchRows,
      state.bankAccounts
    );
  }
  if (hasAny(data, 'cashDeposits')) {
    state.deposits = (data.cashDeposits || []).map((row) => mapDepositRow(row, state.attachments));
  } else if (hasAny(data, 'attachments')) {
    state.deposits = state.deposits.map((deposit) => ({
      ...deposit,
      attachments: state.attachments.filter((file) => file.entityType === 'cash_deposit' && String(file.entityId) === String(deposit.id))
    }));
  }

  if (hasAny(data, 'attendance')) {
    state.attendance = (data.attendance || []).map(mapAttendanceRow);
  }
  if (hasAny(data, 'attendanceAlerts')) {
    state.attendanceAlerts = (data.attendanceAlerts || []).map(mapAttendanceAlertRow);
  }
  if (hasAny(data, 'storeInspections')) {
    state.inspections = (data.storeInspections || []).map(mapInspectionRow);
  }
  if (hasAny(data, 'warningLetterTemplates')) {
    state.warningLetterTemplates = (data.warningLetterTemplates || []).map((template) => ({
      id: template.id,
      level: template.level,
      name: template.name,
      desc: template.description || '',
      body: template.body_template || ''
    }));
  }
  if (hasAny(data, 'warningLetters')) {
    state.warningLetters = (data.warningLetters || []).map(mapWarningLetterRow);
  }
  if (hasAny(data, 'users')) {
    state.users = (data.users || []).map(mapUserRow);
  }

  if (hasAny(data, 'sales', 'cashDeposits', 'storeInspections', 'salesLogs', 'attachments')) {
    state.auditLogs = buildAuditLogs(state.sales, state.inspections, state.deposits);
  }
  return state;
}

function hasAny(data, ...keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function readRows(data, ...keys) {
  const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(data, candidate));
  return key ? data[key] || [] : null;
}

function mapBranchRows(branchRows, staffingRules = []) {
  return branchRows.map((branch) => {
    const branchStaffingRules = staffingRules.filter((rule) => String(rule.branchId) === String(branch.id));
    const hours = { ...DEFAULT_BRANCH_HOURS };
    const hoursEnd = { ...DEFAULT_BRANCH_CLOSE };
    let minWeekday = 1;
    let minWeekend = 1;
    branchStaffingRules.forEach((rule) => {
      const dayKey = DAY_NUMBER_TO_KEY[rule.dayOfWeek];
      if (dayKey) {
        hours[dayKey] = rule.shiftStart || hours[dayKey];
        hoursEnd[dayKey] = rule.shiftEnd || hoursEnd[dayKey];
      }
      if (rule.dayOfWeek >= 1 && rule.dayOfWeek <= 5) minWeekday = Math.max(minWeekday, Number(rule.requiredStaff || 1));
      if (rule.dayOfWeek === 0 || rule.dayOfWeek === 6) minWeekend = Math.max(minWeekend, Number(rule.requiredStaff || 1));
    });
    return {
      id: String(branch.id),
      name: branch.name,
      code: branch.code,
      region: String(branch.region_id || branch.region || 'default'),
      hours,
      hoursEnd,
      minWeekday,
      minWeekend
    };
  });
}

function rebuildRegionsFromBranches(state) {
  Object.values(state.regions).forEach((region) => {
    region.branches = [];
  });
  state.branches.forEach((branch) => {
    if (!state.regions[branch.region]) state.regions[branch.region] = { name: branch.region, branches: [] };
    if (!state.regions[branch.region].branches.includes(branch.id)) state.regions[branch.region].branches.push(branch.id);
  });
}

function buildScheduleMap(scheduleRows) {
  return scheduleRows.reduce((schedule, row) => {
    const key = `${row.branch_id}_${row.work_date}`;
    if (!schedule[key]) schedule[key] = [];
    const employeeId = String(row.employee_id);
    if (!schedule[key].includes(employeeId)) schedule[key].push(employeeId);
    return schedule;
  }, {});
}

function mapEmployeeRowsForState(employeeRows, state, payRows = null) {
  return employeeRows.map((employee) => {
    const employeeId = String(employee.id);
    const fallbackBranch = state.branches.find((branch) => String(branch.region) === String(employee.region_id || state.branches[0]?.region))?.id || state.branches[0]?.id || '';
    const pay = payRows ? getPayProfile(employeeId, payRows, employee.salary) : getMappedPayProfile(employeeId, state.employeePayProfiles, employee.salary);
    return {
      id: employeeId,
      name: employee.name,
      nickname: employee.nickname,
      phone: employee.phone || '',
      line_user_id: employee.line_user_id || '',
      lineUserId: employee.line_user_id || '',
      code: employeeId,
      color: employee.color || '#4CAF50',
      branch: String(getPrimaryBranchForEmployee(employeeId, state) || employee.branch_id || fallbackBranch),
      position: employee.position || 'พนักงานขาย',
      empType: employee.emp_type || employee.empType || 'fulltime',
      salary: Number(employee.salary || pay.monthlySalary || 0),
      region: String(employee.region_id || ''),
      payType: pay.payType,
      payCycle: pay.payCycle,
      dailyRate: pay.dailyRate,
      monthlySalary: pay.monthlySalary,
      breakHours: pay.breakHours,
      commissionEnabled: pay.commissionEnabled,
      commissionRate: pay.commissionRate,
      commissionCalcType: pay.commissionCalcType,
      commissionBranches: state.employeeBranchRules
        .filter((rule) => rule.empId === employeeId && rule.canWork !== false && rule.commissionEligible !== false)
        .map((rule) => rule.branchId),
      specialAllowance: pay.specialAllowance,
      socialSecurityEnabled: pay.socialSecurityEnabled,
      socialSecurityAmount: pay.socialSecurityAmount,
      absenceDeductMode: pay.absenceDeductMode,
      absenceDeductUnit: pay.absenceDeductUnit,
      absenceDeductValue: pay.absenceDeductValue,
      absenceSystemCalc: pay.absenceSystemCalc,
      startDate: pay.effectiveFrom
    };
  });
}

function getMappedPayProfile(empId, profiles, legacySalary) {
  const active = (profiles || [])
    .filter((profile) => profile.empId === String(empId) && profile.active !== false)
    .sort((a, b) => String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || '')))[0];
  if (active) return active;
  return getPayProfile(empId, [], legacySalary);
}

function getPrimaryBranchForEmployee(employeeId, state) {
  const preferredRule = state.employeeBranchRules
    .filter((rule) => rule.empId === employeeId && rule.canWork)
    .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred) || b.priority - a.priority)[0];
  if (preferredRule?.branchId) return preferredRule.branchId;
  const latestSchedule = Object.entries(state.schedule || {})
    .filter(([, employeeIds]) => employeeIds.includes(employeeId))
    .map(([key]) => {
      const [branchId, workDate] = key.split('_');
      return { branchId, workDate };
    })
    .sort((left, right) => String(right.workDate || '').localeCompare(String(left.workDate || '')))[0];
  return latestSchedule?.branchId || state.employeeBranches?.[employeeId]?.[0] || '';
}

function applyMappedPayProfile(employee, profiles) {
  const pay = getMappedPayProfile(employee.id, profiles, employee.salary);
  return {
    ...employee,
    salary: Number(employee.salary || pay.monthlySalary || 0),
    payType: pay.payType,
    payCycle: pay.payCycle,
    dailyRate: pay.dailyRate,
    monthlySalary: pay.monthlySalary,
    breakHours: pay.breakHours,
    commissionEnabled: pay.commissionEnabled,
    commissionRate: pay.commissionRate,
    commissionCalcType: pay.commissionCalcType,
    specialAllowance: pay.specialAllowance,
    socialSecurityEnabled: pay.socialSecurityEnabled,
    socialSecurityAmount: pay.socialSecurityAmount,
    absenceDeductMode: pay.absenceDeductMode,
    absenceDeductUnit: pay.absenceDeductUnit,
    absenceDeductValue: pay.absenceDeductValue,
    absenceSystemCalc: pay.absenceSystemCalc,
    startDate: pay.effectiveFrom
  };
}

function mapLeaveBalances(rows) {
  return rows.reduce((acc, row) => {
    const annualQuota = Number(row.annual_quota ?? row.annual_remaining ?? 0);
    const vacationQuota = Number(row.vacation_quota ?? row.vacation_remaining ?? 0);
    const personalQuota = Number(row.personal_quota ?? 0);
    const annualRemaining = Number(row.annual_remaining ?? 0);
    const vacationRemaining = Number(row.vacation_remaining ?? 0);
    const annualUsed = Number(row.annual_used ?? (annualQuota - annualRemaining) ?? 0);
    const vacationUsed = Number(row.vacation_used ?? (vacationQuota - vacationRemaining) ?? 0);
    acc[String(row.employee_id)] = {
      annualQuota,
      annualRemaining,
      annualUsed,
      vacationQuota,
      vacationRemaining,
      vacationUsed,
      personalQuota,
      personalUsed: Number(row.personal_used ?? 0),
      sickUsed: Number(row.sick_used ?? 0),
      updatedAt: row.updated_at || null
    };
    return acc;
  }, {});
}

function mapBankAccountRows(rows, bankAccountBranchRows = null, previousAccounts = []) {
  const previousBranchIds = new Map(previousAccounts.map((account) => [String(account.id), account.branchIds || []]));
  const branchMap = (bankAccountBranchRows || []).reduce((map, row) => {
    const key = String(row.bank_account_id ?? row.bankAccountId);
    const current = map.get(key) || [];
    current.push(row.branch_id ?? row.branchId);
    map.set(key, current);
    return map;
  }, new Map());
  return rows.map((bank) => {
    const id = String(bank.id);
    const branchIds = bank.branch_ids || bank.branchIds || branchMap.get(id) || previousBranchIds.get(id) || [];
    return {
      id: bank.id,
      bank: bank.bank_name || bank.bank,
      bankShort: bank.bank_short || bank.bankShort,
      color: bank.color_code || bank.color || '#138F2D',
      accNo: bank.account_no || bank.accNo,
      accName: bank.account_name || bank.accName,
      type: bank.account_type || bank.type || 'ออมทรัพย์',
      active: bank.is_active !== false && bank.active !== false,
      branchIds: branchIds.map(String)
    };
  });
}

function derivePrimaryEmployeeBranches(branchRules, scheduleRows) {
  const byEmployee = {};
  branchRules.filter((rule) => rule.canWork).sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred) || b.priority - a.priority).forEach((rule) => {
    if (!byEmployee[rule.empId]) byEmployee[rule.empId] = String(rule.branchId);
  });
  scheduleRows.slice().sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))).forEach((schedule) => {
    const employeeId = String(schedule.employee_id);
    if (!byEmployee[employeeId]) byEmployee[employeeId] = String(schedule.branch_id);
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
  return { id: String(row.id || ''), empId: String(row.employee_id), branchId: String(row.branch_id), canWork: row.can_work !== false, isPreferred: Boolean(row.is_preferred), priority: Number(row.priority || 0), commissionEligible: row.commission_eligible !== false, note: row.note || '' };
}

function mapAvailabilityRule(row) {
  return { id: String(row.id || ''), empId: String(row.employee_id), dayOfWeek: Number(row.day_of_week), type: row.availability_type || 'available', start: formatDbTime(row.start_time), end: formatDbTime(row.end_time), note: row.note || '' };
}

function mapAvailabilityOverride(row) {
  return { id: String(row.id || ''), empId: String(row.employee_id), date: row.work_date, type: row.availability_type || 'available', start: formatDbTime(row.start_time), end: formatDbTime(row.end_time), reason: row.reason || '' };
}

function mapPayProfile(row) {
  return { id: String(row.id || ''), empId: String(row.employee_id), payType: row.pay_type || 'monthly', payCycle: row.pay_cycle || 'monthly', monthlySalary: Number(row.monthly_salary || 0), dailyRate: Number(row.daily_rate || 0), breakHours: Number(row.break_hours || 1), commissionEnabled: row.commission_enabled !== false, commissionRate: Number(row.commission_rate || 0), commissionCalcType: row.commission_calc_type || 'scheduled_assigned_branch_days', specialAllowance: Number(row.special_allowance || 0), socialSecurityEnabled: row.social_security_enabled !== false, socialSecurityAmount: Number(row.social_security_amount ?? 0), absenceDeductMode: row.absence_deduct_mode || 'system', absenceDeductUnit: row.absence_deduct_unit || null, absenceDeductValue: row.absence_deduct_value === null || row.absence_deduct_value === undefined ? null : Number(row.absence_deduct_value), absenceSystemCalc: row.absence_system_calc || null, effectiveFrom: row.effective_from, effectiveTo: row.effective_to, active: row.is_active !== false };
}

function mapSalarySummary(row) {
  return { id: String(row.id || ''), empId: String(row.employee_id), salaryMonth: row.salary_month, grossAmount: Number(row.gross_amount || 0), deductionAmount: Number(row.deduction_amount || 0), netAmount: Number(row.net_amount || 0), detail: row.detail || {}, lineSentAt: row.line_sent_at || null, createdAt: row.created_at || null };
}

function mapStaffingRule(row) {
  return { id: String(row.id || ''), branchId: String(row.branch_id), dayOfWeek: Number(row.day_of_week), requiredStaff: Number(row.required_staff || 1), shiftStart: formatDbTime(row.shift_start), shiftEnd: formatDbTime(row.shift_end), active: row.is_active !== false };
}

function getPayProfile(empId, rows, legacySalary) {
  const active = (rows || []).filter((row) => String(row.employee_id) === String(empId) && row.is_active !== false).sort((a, b) => String(b.effective_from || '').localeCompare(String(a.effective_from || '')))[0];
  if (active) {
    return {
      payType: active.pay_type || 'monthly',
      payCycle: active.pay_cycle || 'monthly',
      monthlySalary: Number(active.monthly_salary || 0),
      dailyRate: Number(active.daily_rate || 0),
      breakHours: Number(active.break_hours || 1),
      commissionEnabled: active.commission_enabled !== false,
      commissionRate: Number(active.commission_rate || 0),
      commissionCalcType: active.commission_calc_type || 'scheduled_assigned_branch_days',
      specialAllowance: Number(active.special_allowance || 0),
      socialSecurityEnabled: active.social_security_enabled !== false,
      socialSecurityAmount: Number(active.social_security_amount ?? 0),
      absenceDeductMode: active.absence_deduct_mode || 'system',
      absenceDeductUnit: active.absence_deduct_unit || null,
      absenceDeductValue: active.absence_deduct_value === null || active.absence_deduct_value === undefined ? null : Number(active.absence_deduct_value),
      absenceSystemCalc: active.absence_system_calc || null,
      effectiveFrom: active.effective_from
    };
  }
  return { payType: 'monthly', payCycle: 'monthly', monthlySalary: Number(legacySalary || 0), dailyRate: 0, breakHours: 1, commissionEnabled: true, commissionRate: 0, commissionCalcType: 'scheduled_assigned_branch_days', specialAllowance: 0, socialSecurityEnabled: true, socialSecurityAmount: 0, absenceDeductMode: 'fixed', absenceDeductUnit: 'occurrence', absenceDeductValue: 50, absenceSystemCalc: null, effectiveFrom: null };
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
    submittedBy: row.submitted_by === null || row.submitted_by === undefined ? null : String(row.submitted_by),
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
  return { id, date: row.deposit_date || row.date, bid: row.branch_id, expected: Number(row.expected_amount || 0), deposited: Number(row.deposited_amount || 0), slip: Boolean(row.slip_url || files.length), slipUrl: row.slip_url || files[0]?.fileUrl || '', attachments: files, bankAccId: row.bank_account_id || null, depositedBy: row.deposited_by === null || row.deposited_by === undefined ? null : String(row.deposited_by), verifiedBy: row.verified_by || null, verifyTime: formatDbTime(row.verified_at), status: row.status || 'waiting', slipOcrStatus: row.slip_ocr_status || 'unchecked', slipOcrAmount: row.slip_ocr_amount === null || row.slip_ocr_amount === undefined ? null : Number(row.slip_ocr_amount), slipOcrConfidence: row.slip_ocr_confidence === null || row.slip_ocr_confidence === undefined ? null : Number(row.slip_ocr_confidence), slipOcrText: row.slip_ocr_text || '', slipOcrCheckedAt: row.slip_ocr_checked_at || null };
}

function mapSalesLogRow(row) {
  return {
    id: String(row.id),
    saleId: String(row.sale_id),
    time: formatDbTime(row.created_at),
    by: row.edited_by === null || row.edited_by === undefined ? null : String(row.edited_by),
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
    storageBucket: row.storage_bucket || null,
    storagePath: row.storage_path || null,
    fileName: row.file_name || null,
    fileType: row.file_type || null,
    fileSize: row.file_size === null || row.file_size === undefined ? null : Number(row.file_size),
    createdAt: row.created_at || null
  };
}

function mapAttendanceRow(row) {
  return {
    id: String(row.id),
    empId: String(row.employee_id),
    date: row.work_date,
    clockIn: formatDbTime(row.clock_in),
    clockOut: formatDbTime(row.clock_out),
    lateMin: Number(row.late_minutes || 0),
    breakStart: formatDbTime(row.break_start),
    breakEnd: formatDbTime(row.break_end),
    breakMinutes: Number(row.break_minutes || 0),
    breakOver: Boolean(row.is_break_over),
    branch: row.branch_id
  };
}

function mapAttendanceAlertRow(alert) {
  return {
    id: String(alert.id),
    type: alert.alert_type,
    empId: String(alert.employee_id),
    date: alert.work_date,
    branch: alert.branch_id,
    title: alert.title,
    detail: alert.detail || '',
    severity: alert.severity || 'warning',
    time: formatDbTime(alert.alert_time) || '',
    ack: Boolean(alert.is_acknowledged)
  };
}

function mapInspectionRow(inspection) {
  return {
    id: String(inspection.id),
    date: inspection.work_date,
    bid: inspection.branch_id,
    submittedBy: inspection.submitted_by === null || inspection.submitted_by === undefined ? null : String(inspection.submitted_by),
    submitTime: formatDbTime(inspection.submit_time),
    closeTime: formatDbTime(inspection.close_time),
    status: inspection.status || 'pass',
    isLate: Boolean(inspection.is_late),
    lateMinutes: Number(inspection.late_minutes || 0),
    note: inspection.manager_note || ''
  };
}

function mapWarningLetterRow(letter) {
  return {
    id: String(letter.id),
    empId: String(letter.employee_id),
    templateId: letter.template_id,
    level: letter.level,
    date: letter.issue_date,
    reason: letter.reason,
    branch: letter.branch_id,
    issuedBy: letter.issued_by === null || letter.issued_by === undefined ? null : String(letter.issued_by),
    status: letter.status || 'draft'
  };
}

function mapUserRow(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    scope: user.scope || user.scope_value || user.scopeValue || user.scopeType || user.scope_type,
    scopeType: user.scopeType || user.scope_type || (user.scope === 'all' ? 'all' : undefined),
    scopeValue: user.scopeValue ?? user.scope_value ?? user.scope,
    scope_type: user.scope_type || user.scopeType || (user.scope === 'all' ? 'all' : undefined),
    scope_value: user.scope_value ?? user.scopeValue ?? user.scope,
    created_at: user.created_at || user.createdAt,
    label: user.label || user.role
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
