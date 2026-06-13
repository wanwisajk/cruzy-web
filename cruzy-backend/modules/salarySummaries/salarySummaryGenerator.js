const { supabase } = require('../../shared/db');
const TABLES = require('../../shared/tables');

function fmtDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthRange(month) {
  const base = month ? new Date(`${String(month).slice(0, 7)}-01T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { month: fmtDate(start), start: fmtDate(start), end: fmtDate(end) };
}

function previousMonth(date = new Date()) {
  return fmtDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

function dateRange(from, to) {
  const days = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    days.push(fmtDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function positiveDiffMinutes(value, target) {
  const valueMinutes = timeToMinutes(value);
  const targetMinutes = timeToMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, valueMinutes - targetMinutes);
}

function activePayProfile(employeeId, rows, range, legacySalary) {
  const active = rows
    .filter((row) => String(row.employee_id) === String(employeeId) && row.is_active !== false)
    .filter((row) => !row.effective_from || row.effective_from <= range.end)
    .filter((row) => !row.effective_to || row.effective_to >= range.start)
    .sort((a, b) => String(b.effective_from || '').localeCompare(String(a.effective_from || '')))[0];

  if (!active) {
    return {
      payType: 'monthly',
      monthlySalary: Number(legacySalary || 0),
      dailyRate: 0,
      commissionEnabled: true,
      commissionRate: 0,
      commissionCalcType: 'scheduled_assigned_branch_days',
      specialAllowance: 0,
      socialSecurityEnabled: true,
      socialSecurityAmount: 0,
      absenceDeductMode: 'fixed',
      absenceDeductUnit: 'occurrence',
      absenceDeductValue: 50,
      absenceSystemCalc: null
    };
  }

  return {
    payType: active.pay_type || 'monthly',
    monthlySalary: Number(active.monthly_salary || 0),
    dailyRate: Number(active.daily_rate || 0),
    commissionEnabled: active.commission_enabled !== false,
    commissionRate: Number(active.commission_rate || 0),
    commissionCalcType: active.commission_calc_type || 'scheduled_assigned_branch_days',
    specialAllowance: Number(active.special_allowance || 0),
    socialSecurityEnabled: active.social_security_enabled !== false,
    socialSecurityAmount: Number(active.social_security_amount || 0),
    absenceDeductMode: active.absence_deduct_mode || 'system',
    absenceDeductUnit: active.absence_deduct_unit || null,
    absenceDeductValue: active.absence_deduct_value === null || active.absence_deduct_value === undefined ? null : Number(active.absence_deduct_value),
    absenceSystemCalc: active.absence_system_calc || null
  };
}

function branchShiftStart(staffingRules, branchId, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const rule = staffingRules.find((item) =>
    String(item.branch_id) === String(branchId) &&
    Number(item.day_of_week) === day &&
    item.is_active !== false
  );
  return String(rule?.shift_start || '10:00').slice(0, 5);
}

function employeeHourlyRate(employee, baseWage, workDays) {
  if (employee.payType === 'daily') return Number(employee.dailyRate || 0) / 8;
  return Number(baseWage || employee.monthlySalary || 0) / Math.max(workDays || 0, 1) / 8;
}

function calculateLateDeduct(employee, baseWage, workDays, lateMinutes, lateCount) {
  const mode = employee.absenceDeductMode || 'fixed';
  const unit = employee.absenceDeductUnit || (mode === 'fixed' ? 'occurrence' : null);
  const fixedValue = Number(employee.absenceDeductValue ?? 50);
  if (lateMinutes <= 0 && lateCount <= 0) return 0;

  if (mode === 'system') {
    const hourlyRate = employee.absenceSystemCalc === 'hourly_fixed' && Number.isFinite(fixedValue)
      ? fixedValue
      : employeeHourlyRate(employee, baseWage, workDays);
    return Math.round((lateMinutes / 60) * hourlyRate);
  }

  if (unit === 'minute') return Math.round(lateMinutes * fixedValue);
  if (unit === 'day') return Math.round(lateCount * fixedValue);
  if (unit === 'hour') return Math.round((lateMinutes / 60) * fixedValue);
  return Math.round(lateCount * fixedValue);
}

function responsibleBranches(employee, branchRules, scheduleMap) {
  const rules = branchRules.filter((rule) => String(rule.employee_id) === String(employee.id) && rule.can_work !== false);
  if (employee.commissionCalcType === 'actual_work_days_all_branches') {
    const workBranches = rules.map((rule) => String(rule.branch_id)).filter(Boolean);
    if (workBranches.length) return [...new Set(workBranches)];
  }

  const commissionBranches = rules
    .filter((rule) => rule.commission_eligible !== false)
    .map((rule) => String(rule.branch_id))
    .filter(Boolean);
  if (rules.length) return [...new Set(commissionBranches)];

  const scheduledBranches = [];
  Object.entries(scheduleMap).forEach(([key, employeeIds]) => {
    if (employeeIds.includes(String(employee.id))) scheduledBranches.push(key.split('_')[0]);
  });
  return [...new Set([...commissionBranches, ...scheduledBranches].filter(Boolean))];
}

function hasScheduledShift(scheduleMap, employeeId, branchId, date) {
  return (scheduleMap[`${branchId}_${date}`] || []).includes(String(employeeId));
}

function saleMatchesCommissionType(employee, sale, branches, periodDays, scheduleMap) {
  if (!branches.map(String).includes(String(sale.branch_id))) return false;
  if (employee.commissionCalcType === 'period_days_responsible_branches') return periodDays.includes(sale.sell_date);
  return hasScheduledShift(scheduleMap, employee.id, sale.branch_id, sale.sell_date);
}

function calculateCommission(employee, sales, periodDays, branchRules, scheduleMap) {
  if (employee.commissionEnabled === false) return { commission: 0, sales: 0, days: 0, breakdown: [] };
  const branches = responsibleBranches(employee, branchRules, scheduleMap);
  if (!branches.length) return { commission: 0, sales: 0, days: 0, breakdown: [] };

  const byBranchDate = new Map();
  sales
    .filter((sale) => periodDays.includes(sale.sell_date))
    .filter((sale) => saleMatchesCommissionType(employee, sale, branches, periodDays, scheduleMap))
    .forEach((sale) => {
      const key = `${sale.sell_date}|${sale.branch_id}`;
      const current = byBranchDate.get(key) || { date: sale.sell_date, branchId: sale.branch_id, sales: 0 };
      current.sales += Number(sale.total_amount || 0);
      byBranchDate.set(key, current);
    });

  const rate = Number(employee.commissionRate || 0) / 100;
  const breakdown = Array.from(byBranchDate.values()).map((row) => ({
    ...row,
    commission: Math.round(row.sales * rate)
  }));
  const commission = breakdown.reduce((sum, row) => sum + row.commission, 0);
  const commissionSales = breakdown.reduce((sum, row) => sum + row.sales, 0);
  const commissionDays = employee.commissionCalcType === 'period_days_responsible_branches'
    ? periodDays.length * branches.length
    : periodDays.reduce((sum, date) => sum + branches.filter((branchId) => hasScheduledShift(scheduleMap, employee.id, branchId, date)).length, 0);

  return { commission, sales: commissionSales, days: commissionDays, breakdown };
}

async function selectRows(table, fromColumn, range) {
  let query = supabase.from(table).select('*');
  if (fromColumn) query = query.gte(fromColumn, range.start).lte(fromColumn, range.end);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function saveSummary(row) {
  const { data: existingRows, error: findError } = await supabase
    .from(TABLES.salarySummaries)
    .select('id')
    .eq('employee_id', row.employee_id)
    .eq('salary_month', row.salary_month)
    .limit(1);
  if (findError) throw findError;

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { data, error } = await supabase
      .from(TABLES.salarySummaries)
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from(TABLES.salarySummaries).insert([row]).select().single();
  if (error) throw error;
  return data;
}

async function generateMonthlySalarySummaries(month) {
  const range = monthRange(month);
  const periodDays = dateRange(range.start, range.end);
  const periodDaySet = new Set(periodDays);

  const [employees, payProfiles, branchRules, schedules, sales, attendance, staffingRules] = await Promise.all([
    selectRows(TABLES.employees),
    selectRows(TABLES.employeePayProfiles),
    selectRows(TABLES.employeeBranchEligibility),
    selectRows(TABLES.schedules, 'work_date', range),
    selectRows(TABLES.sales, 'sell_date', range),
    selectRows(TABLES.attendance, 'work_date', range),
    selectRows(TABLES.branchStaffingRules)
  ]);

  const scheduleMap = {};
  schedules.forEach((row) => {
    const key = `${row.branch_id}_${row.work_date}`;
    if (!scheduleMap[key]) scheduleMap[key] = [];
    const employeeId = String(row.employee_id);
    if (!scheduleMap[key].includes(employeeId)) scheduleMap[key].push(employeeId);
  });

  const saved = [];
  for (const rawEmployee of employees) {
    const pay = activePayProfile(rawEmployee.id, payProfiles, range, rawEmployee.salary);
    const employee = {
      id: String(rawEmployee.id),
      name: rawEmployee.name,
      payType: pay.payType,
      monthlySalary: pay.monthlySalary,
      dailyRate: pay.dailyRate,
      commissionEnabled: pay.commissionEnabled,
      commissionRate: pay.commissionRate,
      commissionCalcType: pay.commissionCalcType,
      specialAllowance: pay.specialAllowance,
      socialSecurityEnabled: pay.socialSecurityEnabled,
      socialSecurityAmount: pay.socialSecurityAmount,
      absenceDeductMode: pay.absenceDeductMode,
      absenceDeductUnit: pay.absenceDeductUnit,
      absenceDeductValue: pay.absenceDeductValue,
      absenceSystemCalc: pay.absenceSystemCalc
    };

    const scheduledBranchDays = new Set();
    const scheduledWorkDates = new Set();
    Object.entries(scheduleMap).forEach(([key, employeeIds]) => {
      const date = key.slice(-10);
      const branchId = key.slice(0, -11);
      if (!periodDaySet.has(date) || !employeeIds.includes(employee.id)) return;
      scheduledBranchDays.add(`${date}_${branchId}`);
      scheduledWorkDates.add(date);
    });

    const workDays = employee.payType === 'monthly' ? scheduledBranchDays.size : scheduledWorkDates.size;
    const baseWage = employee.payType === 'monthly'
      ? Number(employee.monthlySalary || rawEmployee.salary || 0)
      : Number(employee.dailyRate || 0) * workDays;
    const commissionInfo = calculateCommission(employee, sales, periodDays, branchRules, scheduleMap);
    const allowance = Number(employee.specialAllowance || 0);
    const empAttendance = attendance.filter((row) => String(row.employee_id) === employee.id && periodDaySet.has(row.work_date));
    const lateMetrics = empAttendance.reduce((acc, row) => {
      const shiftStart = branchShiftStart(staffingRules, row.branch_id, row.work_date);
      const lateMinutes = Math.max(Number(row.late_minutes || 0), positiveDiffMinutes(row.clock_in, shiftStart));
      return {
        count: acc.count + (lateMinutes > 0 ? 1 : 0),
        minutes: acc.minutes + lateMinutes
      };
    }, { count: 0, minutes: 0 });
    const lateDeduct = calculateLateDeduct(employee, baseWage, workDays, lateMetrics.minutes, lateMetrics.count);
    const sso = employee.socialSecurityEnabled ? Number(employee.socialSecurityAmount || 0) : 0;
    const gross = baseWage + commissionInfo.commission + allowance;
    const deductions = lateDeduct + sso;
    const net = gross - deductions;

    saved.push(await saveSummary({
      employee_id: rawEmployee.id,
      salary_month: range.month,
      gross_amount: gross,
      deduction_amount: deductions,
      net_amount: net,
      detail: {
        generatedBy: 'monthly_auto',
        periodStart: range.start,
        periodEnd: range.end,
        workDays,
        baseWage,
        commission: commissionInfo.commission,
        commissionSales: commissionInfo.sales,
        commissionDays: commissionInfo.days,
        commissionBreakdown: commissionInfo.breakdown,
        allowance,
        lateCount: lateMetrics.count,
        lateMinutes: lateMetrics.minutes,
        lateDeduct,
        socialSecurity: sso
      }
    }));
  }

  return { month: range.month, count: saved.length, rows: saved };
}

module.exports = {
  generateMonthlySalarySummaries,
  previousMonth,
  monthRange
};
