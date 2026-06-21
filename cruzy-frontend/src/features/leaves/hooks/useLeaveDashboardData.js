import { useMemo } from "react";

const DEFAULT_LEAVE_TYPES = ["ลาประจำปี", "ลาป่วย", "ลากิจ", "ลาพักร้อน", "ลาอื่นๆ"];

function sameId(a, b) {
  return String(a) === String(b);
}

function monthKeyFor(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useLeaveDashboardData({ data, currentBranch, filters, leaves }) {
  const visibleEmployees = useMemo(() => {
    if (!data) return [];
    return data.employees.filter(
      (employee) => currentBranch === "all" || sameId(employee.branch, currentBranch),
    );
  }, [data, currentBranch]);

  const visibleEmployeeIds = useMemo(
    () => new Set(visibleEmployees.map((employee) => String(employee.id))),
    [visibleEmployees],
  );

  const leaveBalances = useMemo(() => data?.leaveBalances || {}, [data]);
  const visibleEmployeeMap = useMemo(
    () => new Map(visibleEmployees.map((employee) => [String(employee.id), employee])),
    [visibleEmployees],
  );

  const filteredLeaves = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();

    return leaves
      .filter((leave) => visibleEmployeeIds.has(String(leave.employee_id)))
      .filter((leave) => (filters.leaveType ? leave.leave_type === filters.leaveType : true))
      .filter((leave) => (filters.status ? leave.status === filters.status : true))
      .filter((leave) => (filters.month ? monthKeyFor(leave.start_date) === filters.month : true))
      .filter((leave) => {
        if (!searchValue) return true;
        return [leave.leave_type, leave.reason].some((field) =>
          String(field || "").toLowerCase().includes(searchValue),
        );
      });
  }, [filters, leaves, visibleEmployeeIds]);

  const pendingLeaves = useMemo(
    () => filteredLeaves.filter((leave) => leave.status === "pending"),
    [filteredLeaves],
  );

  const approvedLeaves = useMemo(
    () => filteredLeaves.filter((leave) => leave.status === "approved"),
    [filteredLeaves],
  );

  const resolvedLeaves = useMemo(
    () => filteredLeaves.filter((leave) => ["approved", "rejected"].includes(leave.status)),
    [filteredLeaves],
  );

  const approvedSummary = useMemo(() => {
    const summaryMap = new Map();

    approvedLeaves.forEach((leave) => {
      const employeeId = String(leave.employee_id);
      const employee = visibleEmployeeMap.get(employeeId);
      if (!employee) return;

      const current = summaryMap.get(employeeId) || {
        employeeId: employee.id,
        name: employee.name,
        approvedLeaves: [],
        totals: { annual: 0, vacation: 0, sick: 0, personal: 0 },
      };

      current.approvedLeaves.push(leave);
      const type = String(leave.leave_type || "").toLowerCase();
      const daysCount = Number(leave.days_count || 0);
      if (/ประจำปี|annual|year/i.test(type)) {
        current.totals.annual += daysCount;
      } else if (/พักร้อน|vacation|holiday/i.test(type)) {
        current.totals.vacation += daysCount;
      } else if (/ป่วย|sick/i.test(type)) {
        current.totals.sick += daysCount;
      } else {
        current.totals.personal += daysCount;
      }

      summaryMap.set(employeeId, current);
    });

    return Array.from(summaryMap.values()).map((row) => {
      const leaveBalance = leaveBalances[row.employeeId] || {};
      return {
        employeeId: row.employeeId,
        name: row.name,
        approvedLeaves: row.approvedLeaves,
        summary: {
          annualUsed: row.totals.annual,
          annualQuota: Number(leaveBalance.annualQuota ?? leaveBalance.annual_quota ?? 13),
          vacationUsed: row.totals.vacation,
          vacationQuota: Number(leaveBalance.vacationQuota ?? leaveBalance.vacation_quota ?? 5),
          sickUsed: row.totals.sick,
          personalUsed: row.totals.personal,
        },
      };
    });
  }, [approvedLeaves, leaveBalances, visibleEmployeeMap]);

  const leaveTypes = useMemo(() => {
    const types = new Set(DEFAULT_LEAVE_TYPES);
    leaves.forEach((leave) => {
      if (leave.leave_type) types.add(leave.leave_type);
    });
    return Array.from(types);
  }, [leaves]);

  const months = useMemo(() => {
    const monthsMap = new Map();
    leaves.forEach((leave) => {
      if (!leave.start_date) return;
      const date = new Date(leave.start_date);
      const value = monthKeyFor(leave.start_date);
      if (!monthsMap.has(value)) {
        monthsMap.set(value, date.toLocaleDateString("th-TH", { month: "short", year: "numeric" }));
      }
    });

    return Array.from(monthsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [leaves]);

  const stats = useMemo(() => {
    return leaves.reduce(
      (acc, leave) => {
        if (!visibleEmployeeIds.has(String(leave.employee_id))) return acc;
        if (leave.status === "pending") acc.pending += 1;
        else if (leave.status === "approved") acc.approved += 1;
        else if (leave.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }, [leaves, visibleEmployeeIds]);

  return {
    approvedSummary,
    leaveTypes,
    months,
    pendingLeaves,
    resolvedLeaves,
    stats,
    visibleEmployees,
  };
}
