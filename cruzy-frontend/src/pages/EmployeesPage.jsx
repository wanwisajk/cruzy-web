import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { EmployeeContractDetailModal } from "../features/employees/components/EmployeeContractDetailModal";
import { EmployeeContractsTab } from "../features/employees/components/EmployeeContractsTab";
import { EmployeeFormModal } from "../features/employees/components/EmployeeFormModal";
import { EmployeeInfoTab } from "../features/employees/components/EmployeeInfoTab";
import { EmployeePageTabs } from "../features/employees/components/EmployeePageTabs";
import { EmployeePayrollTab } from "../features/employees/components/EmployeePayrollTab";
import { EmployeeQuickDetailModal } from "../features/employees/components/EmployeeQuickDetailModal";
import { EmployeeViewModal } from "../features/employees/components/EmployeeViewModal";
import { useEmployees } from "../features/employees/hooks/useEmployees";
import {
  attendanceStatus,
  calculateAttendanceMetrics,
  calculateLateDeduct,
  employeeCommissionForPeriod,
  emptyAttendanceForm,
  mapAttendanceResponse,
  payrollPeriodFor,
  prorateMonthlyAmount,
  thDate,
} from "../features/employees/lib/employeePageUtils";
import { api } from "../lib/api";
import { dateRange, fmtDate } from "../lib/date";

export default function EmployeesPage(props) {
  const employees = useEmployees(props);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [activeTab, setActiveTab] = useState("info");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [payCycleFilter, setPayCycleFilter] = useState("weekly");
  const [contractFilter, setContractFilter] = useState("all");
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState(() => emptyContractForm(props.data.initialDate || fmtDate(new Date())));
  const [editingContractId, setEditingContractId] = useState(null);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [contractSaving, setContractSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(
    () => props.data.initialDate || fmtDate(new Date()),
  );
  const [attendanceForm, setAttendanceForm] = useState(() =>
    emptyAttendanceForm(props.data.initialDate || fmtDate(new Date())),
  );
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const branchOptions = useMemo(() => {
    return (
      props.data.branches
        ?.slice()
        .sort((a, b) => a.code.localeCompare(b.code)) || []
    );
  }, [props.data.branches]);

  const counts = useMemo(() => {
    const all = (employees.employees || []).length;
    const fulltime = (employees.employees || []).filter(
      (e) => (e.empType || "fulltime") === "fulltime",
    ).length;
    const parttime = (employees.employees || []).filter(
      (e) => e.empType === "parttime",
    ).length;
    const freelance = (employees.employees || []).filter(
      (e) => e.empType === "freelance",
    ).length;
    return { all, fulltime, parttime, freelance };
  }, [employees.employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === "all") return employees.employees;
    return employees.employees.filter((employee) => {
      const assigned = props.data.employeeBranches?.[employee.id] || [];
      return (
        employee.branch === selectedBranch || assigned.includes(selectedBranch)
      );
    });
  }, [selectedBranch, employees.employees, props.data.employeeBranches]);

  const allEmployees = props.data.employees || [];
  const attendanceRows = props.data.attendance || [];
  const attendanceAlerts = props.data.attendanceAlerts || [];
  const warningLetters = props.data.warningLetters || [];
  const disciplinePeriodDays = useMemo(
    () => (props.from && props.to ? dateRange(props.from, props.to) : []),
    [props.from, props.to],
  );
  const filteredWarningLetters = useMemo(() => {
    return warningLetters.filter((letter) =>
      filteredEmployees.some((employee) => employee.id === letter.empId),
    );
  }, [warningLetters, filteredEmployees]);
  const contracts = props.data.contracts || [];
  const payrollAnchorDate = fmtDate(new Date());
  const payrollPeriod = useMemo(
    () => payrollPeriodFor(payCycleFilter, payrollAnchorDate),
    [payCycleFilter, payrollAnchorDate],
  );
  const payrollPeriodDays = useMemo(
    () =>
      payrollPeriod.start && payrollPeriod.end
        ? dateRange(payrollPeriod.start, payrollPeriod.end)
        : [],
    [payrollPeriod],
  );

  const payrollRows = useMemo(() => {
    const periodDaySet = new Set(payrollPeriodDays);
    return filteredEmployees.map((employee) => {
      const scheduledDays = new Set();
      const scheduledWorkDates = new Set();
      Object.entries(props.data.schedule || {}).forEach(([key, empIds]) => {
        const date = key.slice(-10);
        const branchId = key.slice(0, -11);
        if (!periodDaySet.has(date)) return;
        if (
          selectedBranch !== "all" &&
          String(branchId) !== String(selectedBranch)
        )
          return;
        if ((empIds || []).includes(employee.id)) {
          scheduledDays.add(`${date}_${branchId}`);
          scheduledWorkDates.add(date);
        }
      });

      const empAttendanceRows = attendanceRows.filter(
        (row) =>
          row.empId === employee.id &&
          periodDaySet.has(row.date) &&
          (selectedBranch === "all" ||
            String(row.branch) === String(selectedBranch)),
      );
      const workDays =
        employee.payType === "monthly"
          ? scheduledDays.size
          : scheduledWorkDates.size;
      const baseWage =
        employee.payType === "monthly"
          ? Number(employee.monthlySalary || employee.salary || 0)
          : Number(employee.dailyRate || 0) * workDays;
      const commissionInfo = employeeCommissionForPeriod(
        props.data,
        employee,
        payrollPeriodDays,
        selectedBranch,
      );
      const comm = commissionInfo.commission;
      const allowance =
        employee.payType === "monthly"
          ? prorateMonthlyAmount(
              employee.specialAllowance || 0,
              payrollPeriodDays,
              payCycleFilter,
              payrollAnchorDate,
            )
          : Number(employee.specialAllowance || 0);
      const lateCount = empAttendanceRows.reduce((sum, row) => {
        const metrics = calculateAttendanceMetrics(props.data, row, employee);
        return sum + (metrics.lateMinutes > 0 ? 1 : 0);
      }, 0);
      const lateMinutes = empAttendanceRows.reduce((sum, row) => {
        const metrics = calculateAttendanceMetrics(props.data, row, employee);
        return sum + metrics.lateMinutes;
      }, 0);
      const lateDeduct = calculateLateDeduct(
        employee,
        baseWage,
        workDays,
        lateMinutes,
        lateCount,
      );
      const hasSocialSecurity =
        employee.socialSecurityEnabled ??
        employee.ssoEnabled ??
        employee.hasSocialSecurity ??
        employee.payType === "monthly";
      const sso = hasSocialSecurity
        ? Number(
            employee.socialSecurityAmount ??
              employee.social_security_amount ??
              0,
          )
        : 0;
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
        net,
      };
    });
  }, [
    filteredEmployees,
    attendanceRows,
    payCycleFilter,
    payrollPeriodDays,
    payrollAnchorDate,
    props.data,
    selectedBranch,
  ]);

  const contractRows = useMemo(() => {
    return contracts.filter((contract) => {
      const employee = filteredEmployees.find(
        (item) => item.id === contract.empId,
      );
      const matchEmployee = Boolean(employee);
      const matchFilter =
        contractFilter === "all" ||
        (employee?.empType || "fulltime") === contractFilter;
      return matchEmployee && matchFilter;
    });
  }, [contracts, filteredEmployees, contractFilter]);
  const selectedContract = useMemo(() => (
    selectedContractId ? contracts.find((contract) => String(contract.id) === String(selectedContractId)) : null
  ), [contracts, selectedContractId]);


  const attendanceSummary = useMemo(() => {
    return filteredEmployees.map((employee) => {
      const empAttendance = attendanceRows.filter(
        (row) => row.empId === employee.id,
      );
      const totalLateMins = empAttendance.reduce(
        (sum, row) => sum + Number(row.lateMin || 0),
        0,
      );
      const breakOverCount = attendanceAlerts.filter((alert) => {
        if (alert.empId !== employee.id) return false;
        const type = String(alert.type || "").toLowerCase();
        return type.includes("break") || type.includes("พัก");
      }).length;
      const warnCount = warningLetters.filter(
        (letter) => letter.empId === employee.id,
      ).length;
      return { ...employee, totalLateMins, breakOverCount, warnCount };
    });
  }, [filteredEmployees, attendanceRows, attendanceAlerts, warningLetters]);

  const attendanceFiltered = useMemo(() => {
    if (attendanceFilter === "late")
      return attendanceSummary.filter((item) => item.totalLateMins > 0);
    if (attendanceFilter === "break")
      return attendanceSummary.filter((item) => item.breakOverCount > 0);
    if (attendanceFilter === "warn")
      return attendanceSummary.filter((item) => item.warnCount > 0);
    return attendanceSummary;
  }, [attendanceFilter, attendanceSummary]);

  const attendanceStats = useMemo(() => {
    return {
      totalLate: attendanceSummary.reduce(
        (sum, item) => sum + item.totalLateMins,
        0,
      ),
      totalBreakOver: attendanceSummary.reduce(
        (sum, item) => sum + item.breakOverCount,
        0,
      ),
      totalWarnLetters: attendanceSummary.reduce(
        (sum, item) => sum + item.warnCount,
        0,
      ),
    };
  }, [attendanceSummary]);

  const tabList = [
    { id: "info", label: "ข้อมูลพนักงาน" },
    { id: "payroll", label: "เงินเดือน" },
    { id: "contracts", label: "สัญญาจ้าง" },
    { id: "attendance_discipline", label: "เข้างาน/วินัย" },
  ];

  const searchedEmployees = useMemo(() => {
    return filteredEmployees.filter((employee) => {
      const name = `${employee.name || ""}`.toLowerCase();
      const nickname = `${employee.nickname || ""}`.toLowerCase();
      const code = `${employee.code || employee.id || ""}`.toLowerCase();
      const position = `${employee.position || ""}`.toLowerCase();
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        name.includes(query) ||
        nickname.includes(query) ||
        code.includes(query) ||
        position.includes(query);
      const matchesStatus =
        filterStatus === "all" ||
        (employee.empType || "fulltime") === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [filteredEmployees, search, filterStatus]);

  const attendanceDisciplineRows = useMemo(() => {
    return attendanceRows.filter((row) =>
      disciplinePeriodDays.includes(row.date),
    );
  }, [attendanceRows, disciplinePeriodDays]);

  const attendanceSummaryRows = useMemo(() => {
    const groups = {};
    allEmployees.forEach((employee) => {
      const branchId = employee.branch || "";
      const key = `${employee.id}_${branchId}`;
      groups[key] = {
        empId: employee.id,
        branchId,
        workDays: 0,
        lateCount: 0,
        lateTotal: 0,
        breakOverCount: 0,
        disciplineCount: 0,
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
          disciplineCount: 0,
        };
      }
      groups[key].workDays += 1;
      if (metrics.lateMinutes > 0) groups[key].lateCount += 1;
      groups[key].lateTotal += metrics.lateMinutes;
      if (metrics.breakOver) groups[key].breakOverCount += 1;
    });

    Object.values(groups).forEach((row) => {
      const alertCount = attendanceAlerts.filter(
        (alert) =>
          alert.empId === row.empId &&
          disciplinePeriodDays.includes(alert.date) &&
          String(alert.branch) === String(row.branchId),
      ).length;
      const warningCount = warningLetters.filter(
        (letter) =>
          letter.empId === row.empId &&
          disciplinePeriodDays.includes(letter.date) &&
          (!letter.branch || String(letter.branch) === String(row.branchId)),
      ).length;
      row.disciplineCount = alertCount + warningCount;
    });

    return Object.values(groups);
  }, [
    attendanceDisciplineRows,
    attendanceAlerts,
    warningLetters,
    disciplinePeriodDays,
    allEmployees,
    props.data,
  ]);

  const attendanceFormEmployee = useMemo(
    () =>
      filteredEmployees.find(
        (employee) => employee.id === attendanceForm.employeeId,
      ),
    [filteredEmployees, attendanceForm.employeeId],
  );

  const attendanceFormMetrics = useMemo(
    () =>
      calculateAttendanceMetrics(
        props.data,
        attendanceForm,
        attendanceFormEmployee,
      ),
    [props.data, attendanceForm, attendanceFormEmployee],
  );

  function setAttendanceField(key) {
    return (event) => {
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      setAttendanceForm((current) => ({ ...current, [key]: value }));
    };
  }

  function setAttendanceEmployee(event) {
    const employeeId = event.target.value;
    const employee = filteredEmployees.find((item) => item.id === employeeId);
    setAttendanceForm((current) => ({
      ...current,
      employeeId,
      branchId: current.branchId || employee?.branch || "",
    }));
  }

  function resetAttendanceForm(date = attendanceDate) {
    setAttendanceForm(emptyAttendanceForm(date));
  }
function emptyContractForm(startDate) {
  return {
    employeeId: '',
    contractType: 'fulltime',
    startDate,
    endDate: startDate,
    file: null
  };
}

function contractToForm(contract, startDate) {
  return {
    employeeId: contract?.empId || '',
    contractType: contract?.type || 'fulltime',
    startDate: contract?.start || startDate,
    endDate: contract?.end || contract?.start || startDate,
    file: null
  };
}
function mapContractResponse(row) {
  return {
    id: String(row.id),
    empId: String(row.employee_id),
    type: row.contract_type || row.type || 'fulltime',
    label: row.label || row.contract_type || 'สัญญาจ้าง',
    start: row.start_date || row.start,
    end: row.end_date || row.end,
    file: row.file_url || ''
  };
}

function mapAttachmentResponse(row) {
  return {
    id: String(row.id),
    entityType: row.entity_type || row.entityType,
    entityId: String(row.entity_id || row.entityId),
    fileUrl: row.file_url || row.fileUrl,
    storageBucket: row.storage_bucket || row.storageBucket || null,
    storagePath: row.storage_path || row.storagePath || null,
    fileName: row.file_name || row.fileName || null,
    fileType: row.file_type || row.fileType || null,
    fileSize: row.file_size === null || row.file_size === undefined ? row.fileSize || null : Number(row.file_size),
    createdAt: row.created_at || row.createdAt || null
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

  function editAttendance(row) {
    setAttendanceForm({
      id: row.id,
      employeeId: row.empId,
      branchId: row.branch,
      workDate: row.date,
      clockIn: row.clockIn || "",
      clockOut: row.clockOut || "",
      lateMinutes: String(row.lateMin || 0),
      breakStart: row.breakStart || "",
      breakEnd: row.breakEnd || "",
      isBreakOver: Boolean(row.breakOver),
    });
    setAttendanceDate(row.date);
  }

  async function saveAttendance() {
    if (
      !attendanceForm.employeeId ||
      !attendanceForm.branchId ||
      !attendanceForm.workDate
    ) {
      props.toast?.("กรุณาเลือกพนักงาน สาขา และวันที่");
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
        isBreakOver: attendanceFormMetrics.breakOver,
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
            ? rows.map((row) => (row.id === savedRow.id ? savedRow : row))
            : [...rows, savedRow],
        };
      });
      setAttendanceDate(savedRow.date);
      resetAttendanceForm(savedRow.date);
      props.toast?.(
        attendanceForm.id
          ? "อัปเดตข้อมูลเข้างานแล้ว"
          : "เพิ่มข้อมูลเข้างานแล้ว",
      );
    } catch (error) {
      props.toast?.(error.message || "บันทึกข้อมูลเข้างานไม่สำเร็จ");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function deleteAttendance(row) {
    const ok = window.confirm(
      `ลบข้อมูลเข้างานวันที่ ${row.date} ของ ${filteredEmployees.find((employee) => employee.id === row.empId)?.name || row.empId} ใช่ไหม?`,
    );
    if (!ok) return;
    await api.deleteAttendance(row.id);
    props.setData?.((current) => ({
      ...current,
      attendance: (current.attendance || []).filter(
        (item) => item.id !== row.id,
      ),
    }));
    if (attendanceForm.id === row.id) resetAttendanceForm();
    props.toast?.("ลบข้อมูลเข้างานแล้ว");
  }
 function setContractField(field) {
    return (event) => setContractForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function setContractFile(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setContractForm((current) => ({ ...current, file: null }));
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      props.toast?.('รองรับเฉพาะไฟล์ PDF เท่านั้น');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      props.toast?.('ไฟล์ PDF ต้องไม่เกิน 10MB');
      event.target.value = '';
      return;
    }
    setContractForm((current) => ({ ...current, file }));
  }

  function openContractForm() {
    setContractForm(emptyContractForm(props.data.initialDate || fmtDate(new Date())));
    setEditingContractId(null);
    setShowContractForm(true);
  }

  function contractFiles(contract) {
    if (!contract) return [];
    const attachedFiles = (props.data.attachments || []).filter((file) => (
      file.entityType === 'contract' && String(file.entityId) === String(contract.id)
    ));
    if (contract.file && !attachedFiles.some((file) => file.fileUrl === contract.file)) {
      return [{ id: `contract_${contract.id}_file`, fileUrl: contract.file, entityType: 'contract', entityId: String(contract.id) }, ...attachedFiles];
    }
    return attachedFiles;
  }

  function primaryContractFile(contract) {
    const files = contractFiles(contract);
    return files[files.length - 1] || null;
  }

  function employeeForContract(contract) {
    return filteredEmployees.find((emp) => emp.id === contract?.empId) || allEmployees.find((emp) => emp.id === contract?.empId);
  }

  function editContract(contract) {
    setEditingContractId(contract.id);
    setContractForm(contractToForm(contract, props.data.initialDate || fmtDate(new Date())));
    setShowContractForm(true);
    setSelectedContractId(null);
  }

  function closeContractForm() {
    setShowContractForm(false);
    setEditingContractId(null);
    setContractForm(emptyContractForm(props.data.initialDate || fmtDate(new Date())));
  }

  async function saveContract(event) {
    event.preventDefault();
    if (!contractForm.employeeId || !contractForm.contractType || !contractForm.startDate || !contractForm.endDate) {
      props.toast?.('กรุณากรอกข้อมูลสัญญาจ้างให้ครบ');
      return;
    }
    if (contractForm.endDate < contractForm.startDate) {
      props.toast?.('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มสัญญา');
      return;
    }

    setContractSaving(true);
    try {
      const payload = {
        employeeId: contractForm.employeeId,
        contractType: contractForm.contractType,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate
      };
      const result = editingContractId
        ? await api.updateContract(editingContractId, payload)
        : await api.createContract(payload);
      const saved = mapContractResponse(result.data);
      let savedAttachment = null;
      if (contractForm.file) {
        try {
          const fileData = await fileToDataUrl(contractForm.file);
          const upload = await api.uploadAttachment({
            entityType: 'contract',
            entityId: saved.id,
            fileName: contractForm.file.name,
            fileData
          });
          savedAttachment = mapAttachmentResponse(upload.data);
          saved.file = savedAttachment.fileUrl;
        } catch (uploadError) {
          props.toast?.(uploadError.message || 'เพิ่มสัญญาแล้ว แต่อัปโหลดไฟล์ไม่สำเร็จ');
        }
      }
      props.setData?.((current) => ({
        ...current,
        contracts: editingContractId
          ? (current.contracts || []).map((contract) => String(contract.id) === String(saved.id) ? { ...contract, ...saved } : contract)
          : [...(current.contracts || []), saved],
        attachments: savedAttachment ? [...(current.attachments || []), savedAttachment] : (current.attachments || [])
      }));
      closeContractForm();
      props.toast?.(savedAttachment || !contractForm.file ? (editingContractId ? 'อัปเดตสัญญาจ้างแล้ว' : 'เพิ่มสัญญาจ้างแล้ว') : 'บันทึกสัญญาจ้างแล้ว แต่ยังไม่มีไฟล์ PDF');
    } catch (error) {
      props.toast?.(error.message || 'บันทึกสัญญาจ้างไม่สำเร็จ');
    } finally {
      setContractSaving(false);
    }
  }

  async function deleteContract(contract) {
    const employee = employeeForContract(contract);
    const ok = window.confirm(`ลบสัญญาจ้างของ ${employee?.name || contract.empId} ใช่ไหม?`);
    if (!ok) return;
    try {
      const files = contractFiles(contract).filter((file) => !String(file.id).startsWith('contract_'));
      await Promise.all(files.map((file) => api.deleteAttachment(file.id)));
      await api.deleteContract(contract.id);
      props.setData?.((current) => ({
        ...current,
        contracts: (current.contracts || []).filter((item) => String(item.id) !== String(contract.id)),
        attachments: (current.attachments || []).filter((file) => !(file.entityType === 'contract' && String(file.entityId) === String(contract.id)))
      }));
      setSelectedContractId(null);
      props.toast?.('ลบสัญญาจ้างแล้ว');
    } catch (error) {
      props.toast?.(error.message || 'ลบสัญญาจ้างไม่สำเร็จ');
    }
  }

  const selectedContractEmployee = employeeForContract(selectedContract);
  const selectedContractFiles = contractFiles(selectedContract);
  const selectedContractFile = selectedContractFiles[selectedContractFiles.length - 1] || null;
  const selectedContractFileUrl = selectedContractFile?.fileUrl || selectedContract?.file;
  return (
    <div className="app-page min-h-screen font-sans antialiased text-gray-600">
      <EmployeePageTabs
        activeTab={activeTab}
        tabs={tabList}
        onChange={setActiveTab}
      />

      <div className="page-body max-w-7xl">
        {activeTab === "info" && (
          <EmployeeInfoTab
            branches={props.data.branches}
            counts={counts}
            employees={searchedEmployees}
            filterStatus={filterStatus}
            onCreate={employees.openCreate}
            onDelete={employees.handleDeleteEmployee}
            onEdit={employees.openEdit}
            onFilterStatus={setFilterStatus}
            onSearch={setSearch}
            onView={employees.openView}
            search={search}
          />
        )}

        {activeTab === "payroll" && (
          <EmployeePayrollTab
            payCycleFilter={payCycleFilter}
            payrollPeriod={payrollPeriod}
            payrollPeriodDays={payrollPeriodDays}
            payrollRows={payrollRows}
            onPayCycleChange={setPayCycleFilter}
          />
        )}

        {activeTab === 'contracts' && (
          <EmployeeContractsTab
            contractFilter={contractFilter}
            contractForm={contractForm}
            contractRows={contractRows}
            contractSaving={contractSaving}
            editingContractId={editingContractId}
            employees={filteredEmployees}
            getEmployee={employeeForContract}
            getPrimaryFile={primaryContractFile}
            onCancelForm={closeContractForm}
            onDelete={deleteContract}
            onEdit={editContract}
            onFieldChange={setContractField}
            onFileChange={setContractFile}
            onFilterChange={setContractFilter}
            onOpenForm={openContractForm}
            onSave={saveContract}
            onSelect={setSelectedContractId}
            showContractForm={showContractForm}
          />
        )}

        {activeTab === "attendance_discipline" && (
          <div className="space-y-6">
            <div className="section-card-lg">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div>
                  <label className="block caption-bold text-gray-500 mb-1">
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => {
                      setAttendanceDate(event.target.value);
                      setAttendanceForm((current) => ({
                        ...current,
                        workDate: event.target.value,
                      }));
                    }}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                  <label className="caption-bold text-gray-500">
                    พนักงาน
                    <select
                      value={attendanceForm.employeeId}
                      onChange={setAttendanceEmployee}
                      className="input mt-1"
                    >
                     <option value="">เลือกพนักงาน</option>
                      {filteredEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.nickname || employee.id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="caption-bold text-gray-500">
                    สาขา
                    <select
                      value={attendanceForm.branchId}
                      onChange={setAttendanceField("branchId")}
                      className="input mt-1"
                    >
                      <option value="">เลือกสาขา</option>
                      {props.data.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="caption-bold text-gray-500">
                    เข้างาน
                    <input
                      type="time"
                      value={attendanceForm.clockIn}
                      onChange={setAttendanceField("clockIn")}
                      className="input mt-1"
                    />
                  </label>
                  <label className="caption-bold text-gray-500">
                    ออกงาน
                    <input
                      type="time"
                      value={attendanceForm.clockOut}
                      onChange={setAttendanceField("clockOut")}
                      className="input mt-1"
                    />
                  </label>
                  <label className="caption-bold text-gray-500">
                    เริ่มพัก
                    <input
                      type="time"
                      value={attendanceForm.breakStart}
                      onChange={setAttendanceField("breakStart")}
                      className="input mt-1"
                    />
                  </label>
                  <label className="caption-bold text-gray-500">
                    พักเสร็จ
                    <input
                      type="time"
                      value={attendanceForm.breakEnd}
                      onChange={setAttendanceField("breakEnd")}
                      className="input mt-1"
                    />
                  </label>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">เวลาสาขา</div>
                    <div>
                      {attendanceFormMetrics.shiftStart} -{" "}
                      {attendanceFormMetrics.shiftEnd}
                    </div>
                    <div className="mt-0.5 caption text-gray-400">
                      {attendanceFormMetrics.shiftSource === "branch_db" ||
                      attendanceFormMetrics.shiftSource === "branch_rule"
                        ? "จากเวลาสาขาใน DB"
                        : "ค่าเริ่มต้น"}
                    </div>
                  </div>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">พักที่กำหนด</div>
                    <div>{attendanceFormMetrics.allowedBreak} นาที</div>
                  </div>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">พักจริง</div>
                    <div>{attendanceFormMetrics.actualBreakMinutes} นาที</div>
                  </div>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">สาย</div>
                    <div>{attendanceFormMetrics.lateMinutes} นาที</div>
                  </div>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">ปิดก่อน</div>
                    <div>{attendanceFormMetrics.earlyMinutes} นาที</div>
                  </div>
                  <div className="section-card-soft caption text-gray-600">
                    <div className="body-strong text-gray-500">พักเกิน</div>
                    <div>{attendanceFormMetrics.breakOverMinutes} นาที</div>
                  </div>
                  <div
                    className={`${attendanceFormMetrics.status === "ปกติ" ? "surface-success" : "surface-danger"} px-3 py-2 caption`}
                  >
                    <div className="body-strong">สถานะ</div>
                    <div>{attendanceFormMetrics.status}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={saveAttendance}
                    disabled={attendanceSaving}
                    className="body-strong"
                  >
                    {attendanceForm.id ? "อัปเดต" : "เพิ่ม"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => resetAttendanceForm()}
                    className="body-strong"
                  >
                    ล้าง
                  </Button>
                </div>
              </div>
            </div>

            <div className="table-shell">
              <div className="px-4 py-3 bg-white border-b border-gray-100">
                <h3 className="body-strong text-gray-700">สรุปวินัย</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full body-text border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 caption text-gray-400 body-strong uppercase">
                      <th className="p-3">พนักงาน</th>
                      <th className="p-3">สาขา</th>
                      <th className="p-3">วันทำงาน</th>
                      <th className="p-3">สาย</th>
                      <th className="p-3">รวมสาย (นาที)</th>
                      <th className="p-3">พักเกิน</th>
                      <th className="p-3">วินัย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 body-emphasis">
                    {attendanceSummaryRows.map((row) => {
                      const employee = filteredEmployees.find(
                        (item) => item.id === row.empId,
                      );
                      const branch = props.data.branches.find(
                        (item) => String(item.id) === String(row.branchId),
                      );
                      return (
                        <tr key={`${row.empId}_${row.branchId}`}>
                          <td className="p-3 body-strong text-gray-900">
                            {employee?.name || row.empId}
                          </td>
                          <td className="p-3">
                            {branch?.code || row.branchId}
                          </td>
                          <td className="p-3">{row.workDays}</td>
                          <td className="p-3">{row.lateCount}</td>
                          <td className="p-3">{row.lateTotal}</td>
                          <td className="p-3">{row.breakOverCount}</td>
                          <td className="p-3">{row.disciplineCount}</td>
                        </tr>
                      );
                    })}
                    {attendanceSummaryRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-gray-400 caption"
                        >
                          ไม่มีข้อมูลสรุปวินัยในช่วงวันที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-shell">
              <div className="px-4 py-3 bg-white border-b border-gray-100">
                <h3 className="body-strong text-gray-700">
                  รายละเอียดรายวัน
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full body-text border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 caption text-gray-400 body-strong uppercase">
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
                  <tbody className="divide-y divide-gray-50 text-gray-700 body-emphasis">
                    {attendanceDisciplineRows.map((row) => {
                      const employee = props.data.employees?.find(
                        (item) => item.id === row.empId,
                      );
                      const branch = props.data.branches.find(
                        (item) => String(item.id) === String(row.branch),
                      );
                      const metrics = calculateAttendanceMetrics(
                        props.data,
                        row,
                        employee,
                      );
                      const status = attendanceStatus(
                        row,
                        props.data,
                        employee,
                      );
                      return (
                        <tr key={row.id}>
                          <td className="p-3">{thDate(row.date)}</td>
                          <td className="p-3 body-strong text-gray-900">
                            {employee?.name || row.empId}
                          </td>
                          <td className="p-3">{branch?.code || row.branch}</td>
                          <td className="p-3">{row.clockIn || "-"}</td>
                          <td className="p-3">{row.clockOut || "-"}</td>
                          <td className="p-3">{metrics.lateMinutes}</td>
                          <td className="p-3">{row.breakStart || "-"}</td>
                          <td className="p-3">{row.breakEnd || "-"}</td>
                          <td className="p-3">{metrics.actualBreakMinutes}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full caption-strong ${status === "ปกติ" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-left gap-1.5">
                              <button
                                type="button"
                                onClick={() => editAttendance(row)}
                                className="px-2 py-1 rounded-md border border-blue-100 bg-blue-50 text-blue-700 caption-bold transition hover:border-blue-500"
                              >
                                แก้ไข
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteAttendance(row)}
                                className="px-2 py-1 rounded-md border border-red-100 bg-red-50 text-red-700 caption-bold transition hover:border-red-500"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {attendanceDisciplineRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="text-center py-8 text-gray-400 caption"
                        >
                          ไม่มีรายละเอียดเข้างานในช่วงวันที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <EmployeeContractDetailModal
        contract={selectedContract}
        employee={selectedContractEmployee}
        files={selectedContractFiles}
        fileUrl={selectedContractFileUrl}
        onClose={() => setSelectedContractId(null)}
        onDelete={deleteContract}
        onEdit={editContract}
      />

      {employees.showModal && employees.modalMode !== "view" ? (
        <EmployeeFormModal
          mode={employees.modalMode}
          employee={employees.activeEmployee}
          branches={employees.formBranches}
          onSubmit={employees.handleFormSubmit}
          onClose={employees.closeModal}
        />
      ) : null}

      {employees.showModal &&
      employees.modalMode === "view" &&
      employees.activeEmployee ? (
        <EmployeeViewModal
          employee={employees.activeEmployee}
          branches={props.data.branches}
          onClose={employees.closeModal}
        />
      ) : null}

      <EmployeeQuickDetailModal
        employee={selectedEmp}
        data={props.data}
        onClose={() => setSelectedEmp(null)}
        onEdit={() => {
          employees.openEdit(selectedEmp);
          setSelectedEmp(null);
        }}
        onDelete={async () => {
          const deleted = await employees.handleDeleteEmployee(selectedEmp);
          if (deleted) setSelectedEmp(null);
        }}
      />
    </div>
  );
}
