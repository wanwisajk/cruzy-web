import { fmtDate } from "../../../lib/date";

export const COMMISSION_TYPE_LABELS = {
  scheduled_assigned_branch_days: "เลือกสาขาเอง",
  actual_work_days_all_branches: "ทุกสาขาตามตารางงาน",
  period_days_responsible_branches: "ทุกวันของสาขาที่ดูแล",
};

export const COMMISSION_TYPE_DETAIL_LABELS = {
  scheduled_assigned_branch_days: "เลือกสาขาเอง แล้วคิดเฉพาะวันที่ทำงานในสาขานั้น",
  actual_work_days_all_branches: "ทุกสาขาที่ไปทำงานจริงตามตารางงาน/เข้างาน",
  period_days_responsible_branches: "ทุกวันในงวดของสาขาที่รับผิดชอบดูแล",
};

export function nf(n) {
  return (n ?? 0).toLocaleString("th-TH");
}

export function thDate(ds) {
  if (!ds) return "—";
  return new Date(`${ds}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function statusLabel(status) {
  return (
    {
      fulltime: "Full time ประจำ",
      parttime: "Part time",
      freelance: "Freelance",
    }[status] || status
  );
}

export function statusColor(status) {
  return (
    {
      fulltime: "bg-emerald-100 text-emerald-800",
      parttime: "bg-purple-100 text-purple-800",
      freelance: "bg-blue-100 text-blue-800",
    }[status] || "bg-gray-100 text-gray-700"
  );
}

export function payCycleLabel(c) {
  return (
    {
      weekly: "รายสัปดาห์",
      bimonthly: "จ่ายครึ่งเดือน",
      monthly: "รายเดือน",
    }[c] || c
  );
}

export function payTypeLabel(c) {
  return (
    {
      daily: "รายวัน/รายกะ",
      monthly: "รายเดือน",
    }[c] || c
  );
}

export function emptyAttendanceForm(date) {
  return {
    id: "",
    employeeId: "",
    branchId: "",
    workDate: date,
    clockIn: "",
    clockOut: "",
    lateMinutes: "0",
    breakStart: "",
    breakEnd: "",
    isBreakOver: false,
  };
}

export function mapAttendanceResponse(row) {
  return {
    id: String(row.id),
    empId: row.employee_id,
    date: row.work_date,
    clockIn: String(row.clock_in || "").slice(0, 5),
    clockOut: String(row.clock_out || "").slice(0, 5),
    lateMin: Number(row.late_minutes || 0),
    breakStart: String(row.break_start || "").slice(0, 5),
    breakEnd: String(row.break_end || "").slice(0, 5),
    breakMinutes: Number(row.break_minutes || 0),
    breakOver: Boolean(row.is_break_over),
    branch: row.branch_id,
  };
}

export function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function positiveDiffMinutes(value, target) {
  const valueMinutes = timeToMinutes(value);
  const targetMinutes = timeToMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, valueMinutes - targetMinutes);
}

export function earlyCloseMinutes(clockOut, shiftEnd) {
  const outMinutes = timeToMinutes(clockOut);
  const endMinutes = timeToMinutes(shiftEnd);
  if (outMinutes === null || endMinutes === null) return 0;
  return Math.max(0, endMinutes - outMinutes);
}

export function breakDurationMinutes(breakStart, breakEnd, fallbackMinutes = 0) {
  const startMinutes = timeToMinutes(breakStart);
  const endMinutes = timeToMinutes(breakEnd);
  if (startMinutes === null || endMinutes === null) return Number(fallbackMinutes || 0);
  return Math.max(0, endMinutes - startMinutes);
}

export function employeeBreakMinutes(employee) {
  const rawBreakHours = employee?.breakHours ?? 1;
  const value = Number(rawBreakHours || 1);
  if (!Number.isFinite(value)) return 60;

  const hours = Math.trunc(value);
  const fraction = Number((value - hours).toFixed(2));
  if (fraction === 0.5) return hours * 60 + 30;
  if (fraction > 0 && fraction <= 0.59) return hours * 60 + Math.round(fraction * 100);
  return Math.round(value * 60);
}

export function branchShiftInfo(data, branchId, date) {
  if (!branchId || !date) return { start: "10:00", end: "21:00", source: "default" };
  const day = new Date(`${date}T00:00:00`).getDay();
  const dayKey = { 1: "จ", 2: "อ", 3: "พ", 4: "พฤ", 5: "ศ", 6: "ส", 0: "อา" }[day];
  const branch = (data.branches || []).find((item) => String(item.id) === String(branchId));
  if (branch?.hours?.[dayKey] || branch?.hoursEnd?.[dayKey]) {
    return {
      start: branch.hours?.[dayKey] || "10:00",
      end: branch.hoursEnd?.[dayKey] || "21:00",
      source: "branch_db",
    };
  }
  const rule = (data.branchStaffingRules || []).find(
    (item) => String(item.branchId) === String(branchId) && item.dayOfWeek === day && item.active !== false,
  );
  if (rule) {
    return {
      start: rule.shiftStart || "10:00",
      end: rule.shiftEnd || "21:00",
      source: "branch_rule",
    };
  }
  return { start: "10:00", end: "21:00", source: "default" };
}

export function calculateAttendanceMetrics(data, row, employee) {
  const shift = branchShiftInfo(data, row.branchId || row.branch, row.workDate || row.date);
  const shiftStart = shift.start;
  const shiftEnd = shift.end;
  const allowedBreak = employeeBreakMinutes(employee);
  const lateMinutes = positiveDiffMinutes(row.clockIn, shiftStart);
  const earlyMinutes = earlyCloseMinutes(row.clockOut, shiftEnd);
  const actualBreakMinutes = breakDurationMinutes(row.breakStart, row.breakEnd, row.breakMinutes);
  const breakOverMinutes = Math.max(0, actualBreakMinutes - allowedBreak);
  const tags = [];
  if (lateMinutes > 0) tags.push(`สาย ${lateMinutes} นาที`);
  if (earlyMinutes > 0) tags.push(`ปิดก่อน ${earlyMinutes} นาที`);
  if (breakOverMinutes > 0) tags.push(`พักเกิน ${breakOverMinutes} นาที`);
  return {
    shiftStart,
    shiftEnd,
    shiftSource: shift.source,
    allowedBreak,
    actualBreakMinutes,
    lateMinutes,
    earlyMinutes,
    breakOverMinutes,
    breakOver: breakOverMinutes > 0,
    status: tags.length ? tags.join(", ") : "ปกติ",
  };
}

export function attendanceStatus(row, data, employee) {
  return calculateAttendanceMetrics(data, row, employee).status;
}

export function getResponsibleBranches(data, employee, fallbackBranch) {
  const empId = employee.id;
  const rules = (data?.employeeBranchRules || []).filter((rule) => rule.empId === empId && rule.canWork !== false);
  if (employee.commissionCalcType === "actual_work_days_all_branches") {
    const workRuleBranches = rules.map((rule) => rule.branchId);
    if (workRuleBranches.length) return [...new Set(workRuleBranches.filter(Boolean))];
  }

  const ruleBranches = rules.filter((rule) => rule.commissionEligible !== false).map((rule) => rule.branchId);
  if (rules.length) return [...new Set(ruleBranches.filter(Boolean))];

  const mappedBranches = data?.employeeBranches?.[empId] || [];
  return [...new Set([...ruleBranches, ...mappedBranches, fallbackBranch].filter(Boolean))];
}

export function hasScheduledShift(data, empId, branchId, date) {
  return (data?.schedule?.[`${branchId}_${date}`] || []).includes(empId);
}

export function saleMatchesCommissionType(data, employee, sale, responsibleBranches, periodDays) {
  const branchId = sale.bid;
  const date = sale.date;
  if (!responsibleBranches.map(String).includes(String(branchId))) return false;

  if (employee.commissionCalcType === "period_days_responsible_branches") {
    return periodDays.includes(date);
  }

  return hasScheduledShift(data, employee.id, branchId, date);
}

export function commissionBranchesInScope(responsibleBranches, selectedBranch) {
  const branches = responsibleBranches.filter(Boolean);
  if (selectedBranch === "all") return branches;
  return branches.filter((branchId) => String(branchId) === String(selectedBranch));
}

export function countCommissionDays(data, employee, responsibleBranches, periodDays, selectedBranch = "all") {
  if (employee.commissionEnabled === false) return 0;

  const scopedBranches = commissionBranchesInScope(responsibleBranches, selectedBranch);
  if (!scopedBranches.length) return 0;

  if (employee.commissionCalcType === "period_days_responsible_branches") {
    return periodDays.length;
  }

  return periodDays.filter((date) => scopedBranches.some((branchId) => hasScheduledShift(data, employee.id, branchId, date))).length;
}

export function employeeCommissionForPeriod(data, employee, periodDays, selectedBranch = "all") {
  if (employee.commissionEnabled === false) {
    return {
      commission: 0,
      commissionSales: 0,
      commissionDays: 0,
      commissionTypeLabel: "ไม่คิดค่าคอม",
    };
  }

  const responsibleBranches = getResponsibleBranches(data, employee, employee.branch);
  const eligibleSales = (data?.sales || []).filter((sale) => {
    if (!periodDays.includes(sale.date)) return false;
    if (selectedBranch !== "all" && String(sale.bid) !== String(selectedBranch)) return false;
    return saleMatchesCommissionType(data, employee, sale, responsibleBranches, periodDays);
  });
  const commissionSales = eligibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const commission = Math.round(commissionSales * (Number(employee.commissionRate || 0) / 100));
  const commissionDays = countCommissionDays(data, employee, responsibleBranches, periodDays, selectedBranch);

  return {
    commission,
    commissionSales,
    commissionDays,
    commissionTypeLabel: COMMISSION_TYPE_LABELS[employee.commissionCalcType] || COMMISSION_TYPE_LABELS.scheduled_assigned_branch_days,
  };
}

export function employeeHourlyRate(employee, baseWage, workDays) {
  const dailyHours = 8;
  if (employee.payType === "daily") return Number(employee.dailyRate || 0) / dailyHours;
  const divisorDays = Math.max(workDays || 0, 1);
  return Number(baseWage || employee.monthlySalary || employee.salary || 0) / divisorDays / dailyHours;
}

export function monthDaysFor(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function payrollPeriodFor(cycle, anchorDate) {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (cycle === "weekly") {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: fmtDate(start),
      end: fmtDate(end),
      label: "สรุปรายอาทิตย์",
    };
  }

  if (cycle === "bimonthly") {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const isFirstHalf = anchor.getDate() <= 15;
    const start = new Date(year, month, isFirstHalf ? 1 : 16);
    const end = new Date(year, month, isFirstHalf ? 15 : lastDay);
    return {
      start: fmtDate(start),
      end: fmtDate(end),
      label: isFirstHalf ? "สรุปครึ่งเดือน 1-15" : "สรุปครึ่งเดือน 16-สิ้นเดือน",
    };
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: fmtDate(start), end: fmtDate(end), label: "สรุปรายเดือน" };
}

export function prorateMonthlyAmount(amount, periodDays, cycle, anchorDate) {
  const value = Number(amount || 0);
  if (cycle === "monthly") return value;
  return Math.round(value * (periodDays.length / monthDaysFor(anchorDate)));
}

export function calculateLateDeduct(employee, baseWage, workDays, lateMinutes, lateCount) {
  const mode = employee.absenceDeductMode || employee.absence_deduct_mode || "fixed";
  const unit = employee.absenceDeductUnit || employee.absence_deduct_unit || (mode === "fixed" ? "occurrence" : null);
  const fixedValue = Number(employee.absenceDeductValue ?? employee.absence_deduct_value ?? 50);
  if (lateMinutes <= 0 && lateCount <= 0) return 0;

  if (mode === "system") {
    const systemCalc = employee.absenceSystemCalc || employee.absence_system_calc || "hourly_avg";
    const hourlyRate = systemCalc === "hourly_fixed" && Number.isFinite(fixedValue)
      ? fixedValue
      : employeeHourlyRate(employee, baseWage, workDays);
    return Math.round((lateMinutes / 60) * hourlyRate);
  }

  if (unit === "minute") return Math.round(lateMinutes * fixedValue);
  if (unit === "day") return Math.round(lateCount * fixedValue);
  if (unit === "hour") return Math.round((lateMinutes / 60) * fixedValue);
  return Math.round(lateCount * fixedValue);
}
