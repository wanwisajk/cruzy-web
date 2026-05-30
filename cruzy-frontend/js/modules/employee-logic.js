const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function getBranchRule(branchId, date) {
  const day = new Date(date + 'T00:00:00').getDay();
  const rule = BRANCH_STAFFING_RULES.find(r => r.branchId === branchId && r.dayOfWeek === day && r.active);
  if (rule) return rule;
  const isWeekend = day === 0 || day === 6;
  const quota = BRANCH_QUOTA[branchId] || { weekday: 1, weekend: 1 };
  return { branchId, dayOfWeek: day, requiredStaff: isWeekend ? quota.weekend : quota.weekday, shiftStart: null, shiftEnd: null, active: true };
}

function requiredStaffFor(branchId, date) {
  return Math.max(1, Number(getBranchRule(branchId, date).requiredStaff || 1));
}

function shiftFor(branchId, date) {
  const rule = getBranchRule(branchId, date);
  return { start: rule.shiftStart || null, end: rule.shiftEnd || null };
}

function branchEligibilityFor(empId, branchId) {
  return EMP_BRANCH_RULES.find(r => r.empId === empId && r.branchId === branchId);
}

function canEmployeeWorkBranch(empId, branchId) {
  const rule = branchEligibilityFor(empId, branchId);
  if (rule) return rule.canWork !== false;
  return (EMP_BRANCHES[empId] || []).includes(branchId);
}

function availabilityFor(empId, date) {
  const override = EMP_AVAILABILITY_OVERRIDES.find(r => r.empId === empId && r.date === date);
  if (override) return { type: override.type, start: override.start, end: override.end, source: 'override', reason: override.reason };
  const day = new Date(date + 'T00:00:00').getDay();
  const rule = EMP_AVAILABILITY_RULES.find(r => r.empId === empId && r.dayOfWeek === day);
  if (rule) return { type: rule.type, start: rule.start, end: rule.end, source: 'rule', reason: rule.note };
  return { type: 'available', start: null, end: null, source: 'default', reason: '' };
}

function isEmployeeAvailable(empId, date) {
  const a = availabilityFor(empId, date);
  return !['unavailable', 'day_off'].includes(a.type);
}

function employeeBusyBranch(empId, date) {
  return visBranches().find(br => (SCH[`${br.id}_${date}`] || []).includes(empId)) || null;
}

function employeeWorkload(empId, from, to) {
  const dates = dRange(from, to);
  return dates.reduce((sum, date) => sum + visBranches().filter(br => (SCH[`${br.id}_${date}`] || []).includes(empId)).length, 0);
}

function scheduleCandidateScore(emp, branchId, date, rangeFrom, rangeTo) {
  const rule = branchEligibilityFor(emp.id, branchId);
  const preferred = rule?.isPreferred ? 20 : 0;
  const priority = Number(rule?.priority || 0) * 5;
  const workloadPenalty = employeeWorkload(emp.id, rangeFrom || date, rangeTo || date) * 3;
  const sameRegion = BRANCHES.find(b => b.id === branchId)?.region === emp.region ? 2 : 0;
  return preferred + priority + sameRegion - workloadPenalty;
}

function scheduleCandidates(branchId, date, opts = {}) {
  const existing = SCH[`${branchId}_${date}`] || [];
  const employees = [...new Map(visBranches().flatMap(br => branchEmps(br.id)).map(e => [e.id, e])).values()];
  return employees.map(emp => {
    const busyAt = employeeBusyBranch(emp.id, date);
    const canBranch = canEmployeeWorkBranch(emp.id, branchId);
    const available = isEmployeeAvailable(emp.id, date);
    const alreadyIn = existing.includes(emp.id);
    const score = scheduleCandidateScore(emp, branchId, date, opts.from, opts.to);
    const disabled = alreadyIn || Boolean(busyAt) || !canBranch || !available || emp.status === 'inactive';
    return { emp, busyAt, canBranch, available, alreadyIn, score, disabled };
  }).sort((a, b) => Number(a.disabled) - Number(b.disabled) || b.score - a.score || a.emp.name.localeCompare(b.emp.name));
}

function recommendedEmployees(branchId, date, opts = {}) {
  const existing = SCH[`${branchId}_${date}`] || [];
  const needed = Math.max(0, requiredStaffFor(branchId, date) - existing.length);
  return scheduleCandidates(branchId, date, opts).filter(c => !c.disabled).slice(0, needed);
}

function activePayProfile(empId) {
  const current = EMP_PAY_PROFILES
    .filter(p => p.empId === empId && p.active)
    .sort((a, b) => String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || '')))[0];
  const emp = EMPS.find(e => e.id === empId);
  return current || {
    empId,
    payType: emp?.payType || 'monthly',
    monthlySalary: Number(emp?.monthlySalary || emp?.salary || 0),
    dailyRate: Number(emp?.dailyRate || 0),
    commissionEnabled: emp?.commissionEnabled !== false,
    active: true
  };
}

function employeePayrollSummary(empId, from, to) {
  const profile = activePayProfile(empId);
  const dates = dRange(from, to);
  const attendanceRows = ATTENDANCE.filter(a => a.empId === empId && dates.includes(a.date));
  const scheduledDays = dates.reduce((sum, date) => sum + visBranches().filter(br => (SCH[`${br.id}_${date}`] || []).includes(empId)).length, 0);
  const workedDays = attendanceRows.length || scheduledDays;
  const basePay = profile.payType === 'daily' ? workedDays * Number(profile.dailyRate || 0) : Number(profile.monthlySalary || 0);
  const lateMinutes = attendanceRows.reduce((sum, row) => sum + Number(row.lateMin || 0), 0);
  return { profile, workedDays, scheduledDays, lateMinutes, basePay, commissionEnabled: profile.commissionEnabled };
}
