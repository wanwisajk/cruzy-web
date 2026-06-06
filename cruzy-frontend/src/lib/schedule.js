import { dateRange } from './date';

function sameId(a, b) {
  return String(a) === String(b);
}

function isOffAvailabilityType(type) {
  return ['unavailable', 'day_off', 'off'].includes(String(type || '').toLowerCase());
}

export function getVisibleBranches(data, user, currentBranch) {
  if (!user) return [];
  const branches = user.scope === 'all'
    ? data.branches
    : data.regions[user.scope]
      ? data.branches.filter((branch) => branch.region === user.scope)
      : data.branches.filter((branch) => sameId(branch.id, user.scope));
  if (currentBranch === 'all') return branches;
  return branches.filter((branch) => sameId(branch.id, currentBranch));
}

export function getScopeBranches(data, user) {
  if (!user) return [];
  if (user.scope === 'all') return data.branches;
  if (data.regions[user.scope]) return data.branches.filter((branch) => branch.region === user.scope);
  return data.branches.filter((branch) => sameId(branch.id, user.scope));
}

export function getBranchEmployees(data, branchId) {
  return data.employees.filter((employee) => {
    const hasExplicitEligibility = data.employeeBranchRules.some((rule) => sameId(rule.empId, employee.id));
    const branchMatch = sameId(employee.branch, branchId) || (data.employeeBranches[employee.id] || []).some((id) => sameId(id, branchId));
    if (branchMatch) return true;
    return !hasExplicitEligibility;
  });
}

function getCandidateEmployeesForBranch(data, user, branchId) {
  const targetEmployees = getBranchEmployees(data, branchId);
  if (user?.scope === 'all') return targetEmployees;

  const scopeBranches = getScopeBranches(data, user);
  const inUserScope = (employee) => scopeBranches.some((branch) => (
    sameId(employee.branch, branch.id) ||
    (data.employeeBranches[employee.id] || []).some((id) => sameId(id, branch.id)) ||
    Boolean(branchEligibilityFor(data, employee.id, branch.id))
  ));

  return targetEmployees.filter((employee) => inUserScope(employee) || canEmployeeWorkBranch(data, employee.id, branchId));
}

export function getBranchRule(data, branchId, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const rule = data.branchStaffingRules.find((item) => sameId(item.branchId, branchId) && item.dayOfWeek === day && item.active);
  if (rule) return rule;
  const isWeekend = day === 0 || day === 6;
  const quota = data.branchQuota[branchId] || { weekday: 1, weekend: 1 };
  return { branchId, dayOfWeek: day, requiredStaff: isWeekend ? quota.weekend : quota.weekday, shiftStart: null, shiftEnd: null, active: true };
}

export function requiredStaffFor(data, branchId, date) {
  return Math.max(1, Number(getBranchRule(data, branchId, date).requiredStaff || 1));
}

export function shiftFor(data, branchId, date) {
  const rule = getBranchRule(data, branchId, date);
  return { start: rule.shiftStart || null, end: rule.shiftEnd || null };
}

export function branchEligibilityFor(data, empId, branchId) {
  return data.employeeBranchRules.find((rule) => sameId(rule.empId, empId) && sameId(rule.branchId, branchId));
}

export function canEmployeeWorkBranch(data, empId, branchId) {
  const rule = branchEligibilityFor(data, empId, branchId);
  if (rule) return rule.canWork !== false;
  const hasAnyEligibility = data.employeeBranchRules.some((row) => sameId(row.empId, empId));
  return !hasAnyEligibility;
}

export function availabilityFor(data, empId, date) {
  const override = data.employeeAvailabilityOverrides.find((rule) => sameId(rule.empId, empId) && rule.date === date);
  if (override) return { type: override.type, source: 'override', reason: override.reason };
  const day = new Date(`${date}T00:00:00`).getDay();
  const rule = data.employeeAvailabilityRules.find((item) => sameId(item.empId, empId) && item.dayOfWeek === day);
  if (rule) return { type: rule.type, source: 'rule', reason: rule.note };

  const employee = data.employees.find((item) => sameId(item.id, empId));
  const weeklyOffs = employee?.weeklyOffs || employee?.weeklyOff || [];
  const offDays = Array.isArray(weeklyOffs) ? weeklyOffs.map(String) : [String(weeklyOffs)];
  if (offDays.includes(String(day))) {
    return { type: 'day_off', source: 'weeklyOffs', reason: 'วันหยุดประจำสัปดาห์' };
  }

  return { type: 'available', source: 'default', reason: '' };
}

export function isEmployeeAvailable(data, empId, date) {
  return !isOffAvailabilityType(availabilityFor(data, empId, date).type);
}

export function employeeBusyBranch(data, scopeBranches, empId, date) {
  return scopeBranches.find((branch) => (data.schedule[`${branch.id}_${date}`] || []).some((id) => sameId(id, empId))) || null;
}

export function employeeWorkload(data, scopeBranches, empId, from, to) {
  return dateRange(from, to).reduce((sum, date) => (
    sum + scopeBranches.filter((branch) => (data.schedule[`${branch.id}_${date}`] || []).some((id) => sameId(id, empId))).length
  ), 0);
}

function employeeBranchWorkload(data, branchId, empId, from, to) {
  return dateRange(from, to).reduce((sum, date) => (
    sum + ((data.schedule[`${branchId}_${date}`] || []).some((id) => sameId(id, empId)) ? 1 : 0)
  ), 0);
}

export function scheduleCandidateScore(data, scopeBranches, employee, branchId, date, from, to) {
  const rule = branchEligibilityFor(data, employee.id, branchId);
  const preferred = rule?.isPreferred ? 30 : 0;
  const priority = Number(rule?.priority || 0) * 5;
  const workloadPenalty = employeeWorkload(data, scopeBranches, employee.id, from || date, to || date) * 3;
  const branchRepeatPenalty = employeeBranchWorkload(data, branchId, employee.id, from || date, to || date) * 8;
  const branch = data.branches.find((item) => sameId(item.id, branchId));
  const sameBranch = sameId(employee.branch, branchId) ? 4 : 0;
  const sameRegion = sameId(branch?.region, employee.region) ? 10 : 0;
  return preferred + priority + sameBranch + sameRegion - workloadPenalty - branchRepeatPenalty;
}

export function scheduleCandidates(data, user, branchId, date, opts = {}) {
  const scopeBranches = getScopeBranches(data, user);
  const busyScopeBranches = data.branches || scopeBranches;
  const existing = data.schedule[`${branchId}_${date}`] || [];
  const employees = getCandidateEmployeesForBranch(data, user, branchId);
  return employees.map((employee) => {
    const busyAt = employeeBusyBranch(data, busyScopeBranches, employee.id, date);
    const canBranch = canEmployeeWorkBranch(data, employee.id, branchId);
    const available = isEmployeeAvailable(data, employee.id, date);
    const alreadyIn = existing.some((id) => sameId(id, employee.id));
    const score = scheduleCandidateScore(data, scopeBranches, employee, branchId, date, opts.from, opts.to);
    const disabled = alreadyIn || Boolean(busyAt) || !canBranch || !available;
    return { employee, busyAt, canBranch, available, alreadyIn, score, disabled };
  }).sort((a, b) => Number(a.disabled) - Number(b.disabled) || b.score - a.score || (a.employee.nickname || a.employee.name).localeCompare(b.employee.nickname || b.employee.name));
}

export function recommendedEmployees(data, user, branchId, date, opts = {}) {
  const existing = data.schedule[`${branchId}_${date}`] || [];
  const needed = Math.max(0, requiredStaffFor(data, branchId, date) - existing.length);
  return scheduleCandidates(data, user, branchId, date, opts).filter((candidate) => !candidate.disabled).slice(0, needed);
}
