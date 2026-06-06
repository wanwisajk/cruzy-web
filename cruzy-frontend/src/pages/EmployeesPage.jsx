import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { EmployeeFormModal } from '../features/employees/components/EmployeeFormModal';
import { EmployeeViewModal } from '../features/employees/components/EmployeeViewModal';
import { useEmployees } from '../features/employees/hooks/useEmployees';
import { api } from '../lib/api';
import { dateRange, fmtDate } from '../lib/date';

function nf(n) {
  return (n ?? 0).toLocaleString('th-TH');
}

function thDate(ds) {
  if (!ds) return '—';
  return new Date(`${ds}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
}

function statusLabel(status) {
  return {
    fulltime: 'Full time ประจำ',
    parttime: 'Part time',
    freelance: 'Freelance',
  }[status] || status;
}

function statusColor(status) {
  return {
    fulltime: 'bg-emerald-100 text-emerald-800',
    parttime: 'bg-purple-100 text-purple-800',
    freelance: 'bg-blue-100 text-blue-800',
  }[status] || 'bg-gray-100 text-gray-700';
}

function payCycleLabel(c) {
  return {
    weekly: 'รายสัปดาห์',
    bimonthly: 'จ่ายครึ่งเดือน',
    monthly: 'รายเดือน'
  }[c] || c;
}

function payTypeLabel(c) {
  return {
    daily: 'รายวัน/รายกะ',
    monthly: 'รายเดือน'
  }[c] || c;
}

const COMMISSION_TYPE_LABELS = {
  scheduled_assigned_branch_days: 'เลือกสาขาเอง',
  actual_work_days_all_branches: 'ทุกสาขาตามตารางงาน',
  period_days_responsible_branches: 'ทุกวันของสาขาที่ดูแล'
};

function emptyAttendanceForm(date) {
  return {
    id: '',
    employeeId: '',
    branchId: '',
    workDate: date,
    clockIn: '',
    clockOut: '',
    lateMinutes: '0',
    breakStart: '',
    breakEnd: '',
    isBreakOver: false
  };
}

function mapAttendanceResponse(row) {
  return {
    id: String(row.id),
    empId: row.employee_id,
    date: row.work_date,
    clockIn: String(row.clock_in || '').slice(0, 5),
    clockOut: String(row.clock_out || '').slice(0, 5),
    lateMin: Number(row.late_minutes || 0),
    breakStart: String(row.break_start || '').slice(0, 5),
    breakEnd: String(row.break_end || '').slice(0, 5),
    breakMinutes: Number(row.break_minutes || 0),
    breakOver: Boolean(row.is_break_over),
    branch: row.branch_id
  };
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function positiveDiffMinutes(value, target) {
  const valueMinutes = timeToMinutes(value);
  const targetMinutes = timeToMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, valueMinutes - targetMinutes);
}

function earlyCloseMinutes(clockOut, shiftEnd) {
  const outMinutes = timeToMinutes(clockOut);
  const endMinutes = timeToMinutes(shiftEnd);
  if (outMinutes === null || endMinutes === null) return 0;
  return Math.max(0, endMinutes - outMinutes);
}

function breakDurationMinutes(breakStart, breakEnd, fallbackMinutes = 0) {
  const startMinutes = timeToMinutes(breakStart);
  const endMinutes = timeToMinutes(breakEnd);
  if (startMinutes === null || endMinutes === null) return Number(fallbackMinutes || 0);
  return Math.max(0, endMinutes - startMinutes);
}

function employeeBreakMinutes(employee) {
  const rawBreakHours = employee?.breakHours ?? 1;
  const value = Number(rawBreakHours || 1);
  if (!Number.isFinite(value)) return 60;

  const hours = Math.trunc(value);
  const fraction = Number((value - hours).toFixed(2));
  if (fraction === 0.5) return (hours * 60) + 30;
  if (fraction > 0 && fraction <= 0.59) return (hours * 60) + Math.round(fraction * 100);
  return Math.round(value * 60);
}

function branchShiftInfo(data, branchId, date) {
  if (!branchId || !date) return { start: '10:00', end: '21:00', source: 'default' };
  const day = new Date(`${date}T00:00:00`).getDay();
  const dayKey = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' }[day];
  const branch = (data.branches || []).find((item) => String(item.id) === String(branchId));
  if (branch?.hours?.[dayKey] || branch?.hoursEnd?.[dayKey]) {
    return {
      start: branch.hours?.[dayKey] || '10:00',
      end: branch.hoursEnd?.[dayKey] || '21:00',
      source: 'branch_db'
    };
  }
  const rule = (data.branchStaffingRules || []).find((item) => (
    String(item.branchId) === String(branchId) &&
    item.dayOfWeek === day &&
    item.active !== false
  ));
  if (rule) {
    return {
      start: rule.shiftStart || '10:00',
      end: rule.shiftEnd || '21:00',
      source: 'branch_rule'
    };
  }
  return { start: '10:00', end: '21:00', source: 'default' };
}

function calculateAttendanceMetrics(data, row, employee) {
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
    status: tags.length ? tags.join(', ') : 'ปกติ'
  };
}

function attendanceStatus(row, data, employee) {
  return calculateAttendanceMetrics(data, row, employee).status;
}

function getResponsibleBranches(data, employee, fallbackBranch) {
  const empId = employee.id;
  const rules = (data?.employeeBranchRules || []).filter((rule) => rule.empId === empId && rule.canWork !== false);
  if (employee.commissionCalcType === 'actual_work_days_all_branches') {
    const workRuleBranches = rules.map((rule) => rule.branchId);
    if (workRuleBranches.length) return [...new Set(workRuleBranches.filter(Boolean))];
  }

  const ruleBranches = rules
    .filter((rule) => rule.commissionEligible !== false)
    .map((rule) => rule.branchId);
  if (rules.length) return [...new Set(ruleBranches.filter(Boolean))];

  const mappedBranches = data?.employeeBranches?.[empId] || [];
  return [...new Set([...ruleBranches, ...mappedBranches, fallbackBranch].filter(Boolean))];
}

function hasScheduledShift(data, empId, branchId, date) {
  return (data?.schedule?.[`${branchId}_${date}`] || []).includes(empId);
}

function saleMatchesCommissionType(data, employee, sale, responsibleBranches, periodDays) {
  const branchId = sale.bid;
  const date = sale.date;
  if (!responsibleBranches.map(String).includes(String(branchId))) return false;

  if (employee.commissionCalcType === 'period_days_responsible_branches') {
    return periodDays.includes(date);
  }

  return hasScheduledShift(data, employee.id, branchId, date);
}

function commissionBranchesInScope(responsibleBranches, selectedBranch) {
  const branches = responsibleBranches.filter(Boolean);
  if (selectedBranch === 'all') return branches;
  return branches.filter((branchId) => String(branchId) === String(selectedBranch));
}

function countCommissionDays(data, employee, responsibleBranches, periodDays, selectedBranch = 'all') {
  if (employee.commissionEnabled === false) return 0;

  const scopedBranches = commissionBranchesInScope(responsibleBranches, selectedBranch);
  if (!scopedBranches.length) return 0;

  if (employee.commissionCalcType === 'period_days_responsible_branches') {
    return periodDays.length;
  }

  return periodDays.filter((date) => (
    scopedBranches.some((branchId) => (
      hasScheduledShift(data, employee.id, branchId, date)
    ))
  )).length;
}

function employeeCommissionForPeriod(data, employee, periodDays, selectedBranch = 'all') {
  if (employee.commissionEnabled === false) {
    return { commission: 0, commissionSales: 0, commissionDays: 0, commissionTypeLabel: 'ไม่คิดค่าคอม' };
  }

  const responsibleBranches = getResponsibleBranches(data, employee, employee.branch);
  const eligibleSales = (data?.sales || []).filter((sale) => {
    if (!periodDays.includes(sale.date)) return false;
    if (selectedBranch !== 'all' && String(sale.bid) !== String(selectedBranch)) return false;
    return saleMatchesCommissionType(data, employee, sale, responsibleBranches, periodDays);
  });
  const commissionSales = eligibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const commission = Math.round(commissionSales * (Number(employee.commissionRate || 0) / 100));
  const commissionDays = countCommissionDays(data, employee, responsibleBranches, periodDays, selectedBranch);

  return {
    commission,
    commissionSales,
    commissionDays,
    commissionTypeLabel: COMMISSION_TYPE_LABELS[employee.commissionCalcType] || COMMISSION_TYPE_LABELS.scheduled_assigned_branch_days
  };
}

function employeeHourlyRate(employee, baseWage, workDays) {
  const dailyHours = 8;
  if (employee.payType === 'daily') return Number(employee.dailyRate || 0) / dailyHours;
  const divisorDays = Math.max(workDays || 0, 1);
  return Number(baseWage || employee.monthlySalary || employee.salary || 0) / divisorDays / dailyHours;
}

function monthDaysFor(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function payrollPeriodFor(cycle, anchorDate) {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (cycle === 'weekly') {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmtDate(start), end: fmtDate(end), label: 'สรุปรายอาทิตย์' };
  }

  if (cycle === 'bimonthly') {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const isFirstHalf = anchor.getDate() <= 15;
    const start = new Date(year, month, isFirstHalf ? 1 : 16);
    const end = new Date(year, month, isFirstHalf ? 15 : lastDay);
    return { start: fmtDate(start), end: fmtDate(end), label: isFirstHalf ? 'สรุปครึ่งเดือน 1-15' : 'สรุปครึ่งเดือน 16-สิ้นเดือน' };
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: fmtDate(start), end: fmtDate(end), label: 'สรุปรายเดือน' };
}

function prorateMonthlyAmount(amount, periodDays, cycle, anchorDate) {
  const value = Number(amount || 0);
  if (cycle === 'monthly') return value;
  return Math.round(value * (periodDays.length / monthDaysFor(anchorDate)));
}

function calculateLateDeduct(employee, baseWage, workDays, lateMinutes, lateCount) {
  const mode = employee.absenceDeductMode || employee.absence_deduct_mode || 'fixed';
  const unit = employee.absenceDeductUnit || employee.absence_deduct_unit || (mode === 'fixed' ? 'occurrence' : null);
  const fixedValue = Number(employee.absenceDeductValue ?? employee.absence_deduct_value ?? 50);
  if (lateMinutes <= 0 && lateCount <= 0) return 0;

  if (mode === 'system') {
    const systemCalc = employee.absenceSystemCalc || employee.absence_system_calc || 'hourly_avg';
    const hourlyRate = systemCalc === 'hourly_fixed' && Number.isFinite(fixedValue)
      ? fixedValue
      : employeeHourlyRate(employee, baseWage, workDays);
    return Math.round((lateMinutes / 60) * hourlyRate);
  }

  if (unit === 'minute') return Math.round(lateMinutes * fixedValue);
  if (unit === 'day') return Math.round(lateCount * fixedValue);
  if (unit === 'hour') return Math.round((lateMinutes / 60) * fixedValue);
  return Math.round(lateCount * fixedValue);
}

function StatCard({ label, value, accent = 'green' }) {
  const colorMap = {
    green: 'border-l-emerald-500',
    teal: 'border-l-teal-500',
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500'
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${colorMap[accent] || colorMap.green} px-4 py-3 shadow-sm`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-none">{value}</p>
    </div>
  );
}

export default function EmployeesPage(props) {
  const employees = useEmployees(props);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [activeTab, setActiveTab] = useState('info');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [payCycleFilter, setPayCycleFilter] = useState('weekly');
  const [contractFilter, setContractFilter] = useState('all');
  const [attendanceDate, setAttendanceDate] = useState(() => props.data.initialDate || fmtDate(new Date()));
  const [attendanceForm, setAttendanceForm] = useState(() => emptyAttendanceForm(props.data.initialDate || fmtDate(new Date())));
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const branchOptions = useMemo(() => {
    return props.data.branches?.slice().sort((a, b) => a.code.localeCompare(b.code)) || [];
  }, [props.data.branches]);

  const counts = useMemo(() => {
    const all = (employees.employees || []).length;
    const fulltime = (employees.employees || []).filter(e => (e.empType || 'fulltime') === 'fulltime').length;
    const parttime = (employees.employees || []).filter(e => e.empType === 'parttime').length;
    const freelance = (employees.employees || []).filter(e => e.empType === 'freelance').length;
    return { all, fulltime, parttime, freelance };
  }, [employees.employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees.employees;
    return employees.employees.filter((employee) => {
      const assigned = props.data.employeeBranches?.[employee.id] || [];
      return employee.branch === selectedBranch || assigned.includes(selectedBranch);
    });
  }, [selectedBranch, employees.employees, props.data.employeeBranches]);

  const allEmployees = props.data.employees || [];
  const attendanceRows = props.data.attendance || [];
  const attendanceAlerts = props.data.attendanceAlerts || [];
  const warningLetters = props.data.warningLetters || [];
  const disciplinePeriodDays = useMemo(() => (
    props.from && props.to ? dateRange(props.from, props.to) : []
  ), [props.from, props.to]);
  const filteredWarningLetters = useMemo(() => {
    return warningLetters.filter((letter) => filteredEmployees.some((employee) => employee.id === letter.empId));
  }, [warningLetters, filteredEmployees]);
  const contracts = props.data.contracts || [];
  const payrollAnchorDate = fmtDate(new Date());
  const payrollPeriod = useMemo(
    () => payrollPeriodFor(payCycleFilter, payrollAnchorDate),
    [payCycleFilter, payrollAnchorDate],
  );
  const payrollPeriodDays = useMemo(() => (
    payrollPeriod.start && payrollPeriod.end ? dateRange(payrollPeriod.start, payrollPeriod.end) : []
  ), [payrollPeriod]);

  const payrollRows = useMemo(() => {
    const periodDaySet = new Set(payrollPeriodDays);
    return filteredEmployees
      .map((employee) => {
        const scheduledDays = new Set();
        const scheduledWorkDates = new Set();
        Object.entries(props.data.schedule || {}).forEach(([key, empIds]) => {
          const date = key.slice(-10);
          const branchId = key.slice(0, -11);
          if (!periodDaySet.has(date)) return;
          if (selectedBranch !== 'all' && String(branchId) !== String(selectedBranch)) return;
          if ((empIds || []).includes(employee.id)) {
            scheduledDays.add(`${date}_${branchId}`);
            scheduledWorkDates.add(date);
          }
        });

        const empAttendanceRows = attendanceRows.filter((row) => (
          row.empId === employee.id &&
          periodDaySet.has(row.date) &&
          (selectedBranch === 'all' || String(row.branch) === String(selectedBranch))
        ));
        const workDays = employee.payType === 'monthly' ? scheduledDays.size : scheduledWorkDates.size;
        const baseWage = employee.payType === 'monthly'
          ? prorateMonthlyAmount(employee.monthlySalary || employee.salary || 0, payrollPeriodDays, payCycleFilter, payrollAnchorDate)
          : Number(employee.dailyRate || 0) * workDays;
        const commissionInfo = employeeCommissionForPeriod(props.data, employee, payrollPeriodDays, selectedBranch);
        const comm = commissionInfo.commission;
        const allowance = employee.payType === 'monthly'
          ? prorateMonthlyAmount(employee.specialAllowance || 0, payrollPeriodDays, payCycleFilter, payrollAnchorDate)
          : Number(employee.specialAllowance || 0);
        const lateCount = empAttendanceRows.reduce((sum, row) => {
          const metrics = calculateAttendanceMetrics(props.data, row, employee);
          return sum + (metrics.lateMinutes > 0 ? 1 : 0);
        }, 0);
        const lateMinutes = empAttendanceRows.reduce((sum, row) => {
          const metrics = calculateAttendanceMetrics(props.data, row, employee);
          return sum + metrics.lateMinutes;
        }, 0);
        const lateDeduct = calculateLateDeduct(employee, baseWage, workDays, lateMinutes, lateCount);
        const hasSocialSecurity = employee.socialSecurityEnabled ?? employee.ssoEnabled ?? employee.hasSocialSecurity ?? employee.payType === 'monthly';
        const sso = hasSocialSecurity ? Number(employee.socialSecurityAmount ?? employee.social_security_amount ?? 0) : 0;
        const net = baseWage + comm + allowance - lateDeduct - sso;
        return {
          ...employee,
          workDays,
          periodDays: payrollPeriodDays.length,
          baseWage,
          comm,
          commissionSales: commissionInfo.commissionSales,
          commissionDays: commissionInfo.commissionDays,
          commissionTypeLabel: commissionInfo.commissionTypeLabel,
          allowance,
          lateCount,
          lateMinutes,
          lateDeduct,
          sso,
          net
        };
      });
  }, [filteredEmployees, attendanceRows, payCycleFilter, payrollPeriodDays, payrollAnchorDate, props.data, selectedBranch]);

  const contractRows = useMemo(() => {
    return contracts.filter((contract) => {
      const employee = filteredEmployees.find((item) => item.id === contract.empId);
      const matchEmployee = Boolean(employee);
      const matchFilter = contractFilter === 'all' || (employee?.empType || 'fulltime') === contractFilter;
      return matchEmployee && matchFilter;
    });
  }, [contracts, filteredEmployees, contractFilter]);

  const attendanceSummary = useMemo(() => {
    return filteredEmployees.map((employee) => {
      const empAttendance = attendanceRows.filter((row) => row.empId === employee.id);
      const totalLateMins = empAttendance.reduce((sum, row) => sum + (Number(row.lateMin || 0)), 0);
      const breakOverCount = attendanceAlerts.filter((alert) => {
        if (alert.empId !== employee.id) return false;
        const type = String(alert.type || '').toLowerCase();
        return type.includes('break') || type.includes('พัก');
      }).length;
      const warnCount = warningLetters.filter((letter) => letter.empId === employee.id).length;
      return { ...employee, totalLateMins, breakOverCount, warnCount };
    });
  }, [filteredEmployees, attendanceRows, attendanceAlerts, warningLetters]);

  const attendanceFiltered = useMemo(() => {
    if (attendanceFilter === 'late') return attendanceSummary.filter((item) => item.totalLateMins > 0);
    if (attendanceFilter === 'break') return attendanceSummary.filter((item) => item.breakOverCount > 0);
    if (attendanceFilter === 'warn') return attendanceSummary.filter((item) => item.warnCount > 0);
    return attendanceSummary;
  }, [attendanceFilter, attendanceSummary]);

  const attendanceStats = useMemo(() => {
    return {
      totalLate: attendanceSummary.reduce((sum, item) => sum + item.totalLateMins, 0),
      totalBreakOver: attendanceSummary.reduce((sum, item) => sum + item.breakOverCount, 0),
      totalWarnLetters: attendanceSummary.reduce((sum, item) => sum + item.warnCount, 0)
    };
  }, [attendanceSummary]);

  const tabList = [
    { id: 'info', label: 'ข้อมูลพนักงาน' },
    { id: 'payroll', label: 'เงินเดือน' },
    { id: 'contracts', label: 'สัญญาจ้าง' },
    { id: 'attendance_discipline', label: 'เข้างาน/วินัย' }
  ];

  const searchedEmployees = useMemo(() => {
    return filteredEmployees.filter((employee) => {
      const name = `${employee.name || ''}`.toLowerCase();
      const nickname = `${employee.nickname || ''}`.toLowerCase();
      const code = `${employee.code || employee.id || ''}`.toLowerCase();
      const position = `${employee.position || ''}`.toLowerCase();
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || name.includes(query) || nickname.includes(query) || code.includes(query) || position.includes(query);
      const matchesStatus = filterStatus === 'all' || (employee.empType || 'fulltime') === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [filteredEmployees, search, filterStatus]);

  const attendanceDisciplineRows = useMemo(() => {
    return attendanceRows
      .filter((row) => disciplinePeriodDays.includes(row.date));
  }, [attendanceRows, disciplinePeriodDays]);

  const attendanceSummaryRows = useMemo(() => {
    const groups = {};
    allEmployees.forEach((employee) => {
      const branchId = employee.branch || '';
      const key = `${employee.id}_${branchId}`;
      groups[key] = {
        empId: employee.id,
        branchId,
        workDays: 0,
        lateCount: 0,
        lateTotal: 0,
        breakOverCount: 0,
        disciplineCount: 0
      };
    });

    attendanceDisciplineRows.forEach((row) => {
      const employee = allEmployees.find((item) => item.id === row.empId);
      const metrics = calculateAttendanceMetrics(props.data, row, employee);
      const key = `${row.empId}_${row.branch}`;
      if (!groups[key]) {
        groups[key] = {
          empId: row.empId,
          branchId: row.branch,
          workDays: 0,
          lateCount: 0,
          lateTotal: 0,
          breakOverCount: 0,
          disciplineCount: 0
        };
      }
      groups[key].workDays += 1;
      if (metrics.lateMinutes > 0) groups[key].lateCount += 1;
      groups[key].lateTotal += metrics.lateMinutes;
      if (metrics.breakOver) groups[key].breakOverCount += 1;
    });

    Object.values(groups).forEach((row) => {
      const alertCount = attendanceAlerts.filter((alert) => (
        alert.empId === row.empId &&
        disciplinePeriodDays.includes(alert.date) &&
        String(alert.branch) === String(row.branchId)
      )).length;
      const warningCount = warningLetters.filter((letter) => (
        letter.empId === row.empId &&
        disciplinePeriodDays.includes(letter.date) &&
        (!letter.branch || String(letter.branch) === String(row.branchId))
      )).length;
      row.disciplineCount = alertCount + warningCount;
    });

    return Object.values(groups);
  }, [attendanceDisciplineRows, attendanceAlerts, warningLetters, disciplinePeriodDays, allEmployees, props.data]);

  const attendanceFormEmployee = useMemo(() => (
    filteredEmployees.find((employee) => employee.id === attendanceForm.employeeId)
  ), [filteredEmployees, attendanceForm.employeeId]);

  const attendanceFormMetrics = useMemo(() => (
    calculateAttendanceMetrics(props.data, attendanceForm, attendanceFormEmployee)
  ), [props.data, attendanceForm, attendanceFormEmployee]);

  function setAttendanceField(key) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setAttendanceForm((current) => ({ ...current, [key]: value }));
    };
  }

  function setAttendanceEmployee(event) {
    const employeeId = event.target.value;
    const employee = filteredEmployees.find((item) => item.id === employeeId);
    setAttendanceForm((current) => ({
      ...current,
      employeeId,
      branchId: current.branchId || employee?.branch || ''
    }));
  }

  function resetAttendanceForm(date = attendanceDate) {
    setAttendanceForm(emptyAttendanceForm(date));
  }

  function editAttendance(row) {
    setAttendanceForm({
      id: row.id,
      employeeId: row.empId,
      branchId: row.branch,
      workDate: row.date,
      clockIn: row.clockIn || '',
      clockOut: row.clockOut || '',
      lateMinutes: String(row.lateMin || 0),
      breakStart: row.breakStart || '',
      breakEnd: row.breakEnd || '',
      isBreakOver: Boolean(row.breakOver)
    });
    setAttendanceDate(row.date);
  }

  async function saveAttendance() {
    if (!attendanceForm.employeeId || !attendanceForm.branchId || !attendanceForm.workDate) {
      props.toast?.('กรุณาเลือกพนักงาน สาขา และวันที่');
      return;
    }
    setAttendanceSaving(true);
    try {
      const payload = {
        employeeId: attendanceForm.employeeId,
        branchId: attendanceForm.branchId,
        workDate: attendanceForm.workDate,
        clockIn: attendanceForm.clockIn || null,
        clockOut: attendanceForm.clockOut || null,
        lateMinutes: attendanceFormMetrics.lateMinutes,
        breakStart: attendanceForm.breakStart || null,
        breakEnd: attendanceForm.breakEnd || null,
        breakMinutes: attendanceFormMetrics.actualBreakMinutes,
        isBreakOver: attendanceFormMetrics.breakOver
      };
      const result = attendanceForm.id
        ? await api.updateAttendance(attendanceForm.id, payload)
        : await api.createAttendance(payload);
      const savedRow = mapAttendanceResponse(result.data || result);

      props.setData?.((current) => {
        const rows = current.attendance || [];
        const exists = rows.some((row) => row.id === savedRow.id);
        return {
          ...current,
          attendance: exists
            ? rows.map((row) => row.id === savedRow.id ? savedRow : row)
            : [...rows, savedRow]
        };
      });
      setAttendanceDate(savedRow.date);
      resetAttendanceForm(savedRow.date);
      props.toast?.(attendanceForm.id ? 'อัปเดตข้อมูลเข้างานแล้ว' : 'เพิ่มข้อมูลเข้างานแล้ว');
    } catch (error) {
      props.toast?.(error.message || 'บันทึกข้อมูลเข้างานไม่สำเร็จ');
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function deleteAttendance(row) {
    const ok = window.confirm(`ลบข้อมูลเข้างานวันที่ ${row.date} ของ ${filteredEmployees.find((employee) => employee.id === row.empId)?.name || row.empId} ใช่ไหม?`);
    if (!ok) return;
    await api.deleteAttendance(row.id);
    props.setData?.((current) => ({
      ...current,
      attendance: (current.attendance || []).filter((item) => item.id !== row.id)
    }));
    if (attendanceForm.id === row.id) resetAttendanceForm();
    props.toast?.('ลบข้อมูลเข้างานแล้ว');
  }

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans antialiased text-gray-600">
       




      <div className="bg-white border-b border-gray-100 px-6 shadow-xs">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 max-w-7xl">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard label="ทั้งหมด" value={counts.all} accent="green" />
              <StatCard label="Full time" value={counts.fulltime} accent="teal" />
              <StatCard label="Part time" value={counts.parttime} accent="amber" />
              <StatCard label="Freelance" value={counts.freelance} accent="blue" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex shrink-0 justify-end">
                  <Button variant="primary" size="sm" onClick={employees.openCreate}>+ เพิ่มพนักงาน</Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {['all','fulltime','parttime','freelance'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${filterStatus === s ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
                      {s === 'all' ? 'ทั้งหมด' : statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                      <th className="px-4 py-3">รหัส/พนักงาน</th>
                      <th className="px-4 py-3">ตำแหน่ง</th>
                      <th className="px-4 py-3">สาขาหลัก</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                      <th className="px-4 py-3">เริ่มงาน</th>
                      <th className="px-4 py-3">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {searchedEmployees.map((employee) => {
                      const branch = props.data.branches?.find((item) => item.id === employee.branch);
                      return (
                        <tr key={employee.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: employee.color }} />
                              <div>
                                <div>{employee.name} ({employee.nickname || ''})</div>
                                <div className="text-2xs text-gray-400 font-mono">{employee.code || employee.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{employee.position}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
                              {branch?.code || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold tracking-wide ${statusColor(employee.empType || 'fulltime')}`}>
                              {statusLabel(employee.empType || 'fulltime')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">{employee.phone || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{thDate(employee.startDate || employee.start || employee.hiredAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => employees.openView(employee)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition-all"
                              >
                                ดูข้อมูล
                              </button>
                              <button
                                type="button"
                                onClick={() => employees.openEdit(employee)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-all"
                              >
                                แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => employees.handleDeleteEmployee(employee)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition-all"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {searchedEmployees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบพนักงาน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="text-sm font-bold text-gray-700">รายการคำนวณรอบจ่ายปัจจุบัน</span>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {payrollPeriod.label} · ช่วงวันที่ {payrollPeriodDays[0] || '-'} ถึง {payrollPeriodDays.at(-1) || '-'}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { id: 'weekly', label: '💵 สรุปรายอาทิตย์' },
                  { id: 'bimonthly', label: '💵 สรุปครึ่งเดือน' },
                  { id: 'monthly', label: '💵 สรุปรายเดือน' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPayCycleFilter(item.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${payCycleFilter === item.id ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold uppercase">
                      <th className="px-3 py-2.5">พนักงาน</th>
                      <th className="px-3 py-2.5">ประเภท</th>
                      <th className="px-3 py-2.5 text-right">วันทำงาน</th>
                      <th className="px-3 py-2.5">ค่าจ้างพื้นฐาน</th>
                      <th className="px-3 py-2.5">ค่าคอมฯ</th>
                      <th className="px-3 py-2.5">เบี้ยพิเศษ</th>
                      <th className="px-3 py-2.5">หักสาย</th>
                      <th className="px-3 py-2.5">หัก ปกส.</th>
                      <th className="px-3 py-2.5 text-right">สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {payrollRows.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/30">
                        <td className="px-3 py-2.5 text-gray-900 font-semibold">{p.name} ({p.nickname || ''})</td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {payCycleLabel(p.payCycle)}
                          <div className="text-[10px] text-gray-400">{payTypeLabel(p.payType)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right">{p.payType === 'monthly' ? '-' : nf(p.workDays)}</td>
                        <td className="px-3 py-2.5">฿{nf(p.baseWage)}</td>
                        <td className="px-3 py-2.5 text-emerald-600">
                          +฿{nf(p.comm)}
                          <div className="text-[10px] text-gray-400">{p.commissionTypeLabel} · {p.commissionDays} วัน</div>
                        </td>
                        <td className="px-3 py-2.5 text-blue-600">+฿{nf(p.allowance)}</td>
                        <td className="px-3 py-2.5 text-red-500">
                          -฿{nf(p.lateDeduct)}
                          <div className="text-[10px] text-gray-400">{p.lateCount} ครั้ง · {p.lateMinutes} นาที</div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-400">-฿{nf(p.sso)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700 text-sm">฿{nf(p.net)}</td>
                      </tr>
                    ))}
                    {payrollRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-gray-400">ไม่มีข้อมูลเงินเดือนในตัวกรองนี้</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-100 pb-2">
              {['all', 'fulltime', 'parttime', 'freelance'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContractFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${contractFilter === type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {type === 'all' ? 'ทั้งหมด' : statusLabel(type)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contractRows.map((contract) => {
                const employee = filteredEmployees.find((emp) => emp.id === contract.empId);
                return (
                  <div key={contract.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{contract.label || 'สัญญาจ้าง'}</h4>
                      <p className="text-2xs text-gray-400">พนักงาน: {employee?.name || '—'} · ประเภท: {contract.type}</p>
                      <p className="text-xs text-gray-500 mt-1">ระยะเวลา: {thDate(contract.start)} ถึง {thDate(contract.end)}</p>
                    </div>
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold border border-emerald-100">
                      📂 {contract.file ? 'เปิดไฟล์' : 'ไม่มีไฟล์'}
                    </div>
                  </div>
                );
              })}
              {contractRows.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400">ไม่พบสัญญาจ้างในสาขา/ชุดข้อมูลนี้</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance_discipline' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => {
                      setAttendanceDate(event.target.value);
                      setAttendanceForm((current) => ({ ...current, workDate: event.target.value }));
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                  <label className="text-xs font-bold text-gray-500">
                    พนักงาน
                    <select value={attendanceForm.employeeId} onChange={setAttendanceEmployee} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none">
                      <option value="">เลือกพนักงาน</option>
                      {filteredEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name} ({employee.nickname || employee.id})</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-gray-500">
                    สาขา
                    <select value={attendanceForm.branchId} onChange={setAttendanceField('branchId')} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none">
                      <option value="">เลือกสาขา</option>
                      {props.data.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-gray-500">
                    เข้างาน
                    <input type="time" value={attendanceForm.clockIn} onChange={setAttendanceField('clockIn')} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none" />
                  </label>
                  <label className="text-xs font-bold text-gray-500">
                    ออกงาน
                    <input type="time" value={attendanceForm.clockOut} onChange={setAttendanceField('clockOut')} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none" />
                  </label>
                  <label className="text-xs font-bold text-gray-500">
                    เริ่มพัก
                    <input type="time" value={attendanceForm.breakStart} onChange={setAttendanceField('breakStart')} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none" />
                  </label>
                  <label className="text-xs font-bold text-gray-500">
                    พักเสร็จ
                    <input type="time" value={attendanceForm.breakEnd} onChange={setAttendanceField('breakEnd')} className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none" />
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">เวลาสาขา</div>
                    <div>{attendanceFormMetrics.shiftStart} - {attendanceFormMetrics.shiftEnd}</div>
                    <div className="mt-0.5 text-[10px] text-gray-400">
                      {attendanceFormMetrics.shiftSource === 'branch_db' || attendanceFormMetrics.shiftSource === 'branch_rule' ? 'จากเวลาสาขาใน DB' : 'ค่าเริ่มต้น'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">พักที่กำหนด</div>
                    <div>{attendanceFormMetrics.allowedBreak} นาที</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">พักจริง</div>
                    <div>{attendanceFormMetrics.actualBreakMinutes} นาที</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">สาย</div>
                    <div>{attendanceFormMetrics.lateMinutes} นาที</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">ปิดก่อน</div>
                    <div>{attendanceFormMetrics.earlyMinutes} นาที</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <div className="font-bold text-gray-500">พักเกิน</div>
                    <div>{attendanceFormMetrics.breakOverMinutes} นาที</div>
                  </div>
                  <div className={`rounded-lg border px-3 py-2 text-xs ${attendanceFormMetrics.status === 'ปกติ' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <div className="font-bold">สถานะ</div>
                    <div>{attendanceFormMetrics.status}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveAttendance}
                    disabled={attendanceSaving}
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold disabled:bg-emerald-300"
                  >
                    {attendanceForm.id ? 'อัปเดต' : 'เพิ่ม'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetAttendanceForm()}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold"
                  >
                    ล้าง
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">สรุปวินัย</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                      <th className="p-3">พนักงาน</th>
                      <th className="p-3">สาขา</th>
                      <th className="p-3 text-right">วันทำงาน</th>
                      <th className="p-3 text-right">สาย</th>
                      <th className="p-3 text-right">รวมสาย (นาที)</th>
                      <th className="p-3 text-right">พักเกิน</th>
                      <th className="p-3 text-right">วินัย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                    {attendanceSummaryRows.map((row) => {
                      const employee = filteredEmployees.find((item) => item.id === row.empId);
                      const branch = props.data.branches.find((item) => String(item.id) === String(row.branchId));
                      return (
                        <tr key={`${row.empId}_${row.branchId}`}>
                          <td className="p-3 font-bold text-gray-900">{employee?.name || row.empId}</td>
                          <td className="p-3">{branch?.code || row.branchId}</td>
                          <td className="p-3 text-right">{row.workDays}</td>
                          <td className="p-3 text-right">{row.lateCount}</td>
                          <td className="p-3 text-right">{row.lateTotal}</td>
                          <td className="p-3 text-right">{row.breakOverCount}</td>
                          <td className="p-3 text-right">{row.disciplineCount}</td>
                        </tr>
                      );
                    })}
                    {attendanceSummaryRows.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">ไม่มีข้อมูลสรุปวินัยในช่วงวันที่เลือก</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">รายละเอียดรายวัน</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                      <th className="p-3">วันที่</th>
                      <th className="p-3">พนักงาน</th>
                      <th className="p-3">สาขา</th>
                      <th className="p-3">เข้างาน</th>
                      <th className="p-3">ออกงาน</th>
                      <th className="p-3 text-right">สาย</th>
                      <th className="p-3">เริ่มพัก</th>
                      <th className="p-3">พักเสร็จ</th>
                      <th className="p-3 text-right">พัก (นาที)</th>
                      <th className="p-3">สถานะ</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                    {attendanceDisciplineRows.map((row) => {
                      const employee = props.data.employees?.find((item) => item.id === row.empId);
                      const branch = props.data.branches.find((item) => String(item.id) === String(row.branch));
                      const metrics = calculateAttendanceMetrics(props.data, row, employee);
                      const status = attendanceStatus(row, props.data, employee);
                      return (
                        <tr key={row.id}>
                          <td className="p-3">{thDate(row.date)}</td>
                          <td className="p-3 font-bold text-gray-900">{employee?.name || row.empId}</td>
                          <td className="p-3">{branch?.code || row.branch}</td>
                          <td className="p-3">{row.clockIn || '-'}</td>
                          <td className="p-3">{row.clockOut || '-'}</td>
                          <td className="p-3 text-right">{metrics.lateMinutes}</td>
                          <td className="p-3">{row.breakStart || '-'}</td>
                          <td className="p-3">{row.breakEnd || '-'}</td>
                          <td className="p-3 text-right">{metrics.actualBreakMinutes}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-semibold ${status === 'ปกติ' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1.5">
                              <button type="button" onClick={() => editAttendance(row)} className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">แก้ไข</button>
                              <button type="button" onClick={() => deleteAttendance(row)} className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold">ลบ</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {attendanceDisciplineRows.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-8 text-gray-400 text-xs">ไม่มีรายละเอียดเข้างานในช่วงวันที่เลือก</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {employees.showModal && employees.modalMode !== 'view' ? (
        <EmployeeFormModal
          mode={employees.modalMode}
          employee={employees.activeEmployee}
          branches={employees.formBranches}
          onSubmit={employees.handleFormSubmit}
          onClose={employees.closeModal}
        />
      ) : null}

      {employees.showModal && employees.modalMode === 'view' && employees.activeEmployee ? (
        <EmployeeViewModal
          employee={employees.activeEmployee}
          branches={props.data.branches}
          onClose={employees.closeModal}
        />
      ) : null}

      {selectedEmp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{ borderTop: `5px solid ${selectedEmp.color || '#4CAF50'}` }}>
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedEmp.name} ({selectedEmp.nickname || ''})</h2>
                <p className="text-2xs text-gray-400 font-mono mt-0.5">{selectedEmp.code || selectedEmp.id} · {selectedEmp.position}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    employees.openEdit(selectedEmp);
                    setSelectedEmp(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-all"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const deleted = await employees.handleDeleteEmployee(selectedEmp);
                    if (deleted) setSelectedEmp(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition-all"
                >
                  ลบ
                </button>
                <button onClick={() => setSelectedEmp(null)} className="text-gray-400 hover:text-gray-600 text-xl font-semibold">&times;</button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">เบอร์โทร:</span> <span className="font-semibold">{selectedEmp.phone || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">สาขาหลัก:</span> <span className="font-semibold">{props.data.branches?.find((b) => b.id === selectedEmp.branch)?.name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">สาขาที่วิ่งงานได้:</span> <span className="font-semibold text-emerald-700">{(props.data.employeeBranches?.[selectedEmp.id] || []).map((bid) => props.data.branches?.find((b) => b.id === bid)?.code).filter(Boolean).join(', ') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ประเภทสัญญา:</span> <span className="font-semibold">{statusLabel(selectedEmp.empType || 'fulltime')}</span></div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">รูปแบบค่าจ้าง:</span> <span className="font-semibold">{payCycleLabel(selectedEmp.payType)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ฐานรายได้:</span> <span className="font-bold text-gray-900">฿{nf(selectedEmp.monthlySalary || selectedEmp.salary || selectedEmp.dailyRate)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">เบี้ยเลี้ยงพิเศษ:</span> <span className="font-semibold">฿{nf(selectedEmp.specialAllowance || 0)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
