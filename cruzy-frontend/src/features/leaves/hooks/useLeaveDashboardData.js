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

  const approvedSummary = useMemo(() => {
    return visibleEmployees
      .map((employee) => {
        const employeeLeaves = approvedLeaves.filter((leave) => sameId(leave.employee_id, employee.id));
        if (!employeeLeaves.length) return null;

        const totals = employeeLeaves.reduce(
          (sum, leave) => {
            const type = String(leave.leave_type || "").toLowerCase();
            if (/ประจำปี|annual|year/i.test(type)) {
              sum.annual += Number(leave.days_count || 0);
            } else if (/พักร้อน|vacation|holiday/i.test(type)) {
              sum.vacation += Number(leave.days_count || 0);
            } else if (/ป่วย|sick/i.test(type)) {
              sum.sick += Number(leave.days_count || 0);
            } else {
              sum.personal += Number(leave.days_count || 0);
            }
            return sum;
          },
          { annual: 0, vacation: 0, sick: 0, personal: 0 },
        );

        const leaveBalance = leaveBalances[employee.id] || {};

        return {
          employeeId: employee.id,
          name: employee.name,
          approvedLeaves: employeeLeaves,
          summary: {
            annualUsed: totals.annual,
            annualQuota: Number(leaveBalance.annualQuota ?? leaveBalance.annual_quota ?? 13),
            vacationUsed: totals.vacation,
            vacationQuota: Number(leaveBalance.vacationQuota ?? leaveBalance.vacation_quota ?? 5),
            sickUsed: totals.sick,
            personalUsed: totals.personal,
          },
        };
      })
      .filter(Boolean);
  }, [approvedLeaves, leaveBalances, visibleEmployees]);

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

  const stats = useMemo(
    () => ({
      pending: leaves.filter(
        (leave) => leave.status === "pending" && visibleEmployeeIds.has(String(leave.employee_id)),
      ).length,
      approved: leaves.filter(
        (leave) => leave.status === "approved" && visibleEmployeeIds.has(String(leave.employee_id)),
      ).length,
      rejected: leaves.filter(
        (leave) => leave.status === "rejected" && visibleEmployeeIds.has(String(leave.employee_id)),
      ).length,
    }),
    [leaves, visibleEmployeeIds],
  );

  return {
    approvedSummary,
    leaveTypes,
    months,
    pendingLeaves,
    stats,
    visibleEmployees,
  };
}
