import { useMemo, useState } from 'react';
import { getVisibleBranches } from '../../../lib/schedule';
import { employeesApi } from '../services/employeesApi';

export function useEmployees({ data, user, currentBranch, setData, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [activeEmployee, setActiveEmployee] = useState(null);

  const branches = useMemo(() => getVisibleBranches(data, user, currentBranch), [data, user, currentBranch]);
  const branchIds = useMemo(() => branches.map((branch) => branch.id), [branches]);

  const employees = useMemo(() => data.employees.filter((employee) => (
    branchIds.includes(employee.branch) ||
    (data.employeeBranches[employee.id] || []).some((id) => branchIds.includes(id))
  )), [data.employees, data.employeeBranches, branchIds]);

  const employmentTypeCounts = useMemo(() => data.employees.reduce((acc, employee) => {
    const type = employee.empType || 'fulltime';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, { fulltime: 0, parttime: 0, freelance: 0 }), [data.employees]);

  const stats = useMemo(() => [
    ['รวมทั้งหมด', data.employees.length, 'slate'],
    ['เต็มเวลา', employmentTypeCounts.fulltime, 'emerald'],
    ['พาร์ตไทม์', employmentTypeCounts.parttime, 'amber'],
    ['Freelance', employmentTypeCounts.freelance, 'sky']
  ], [data.employees.length, employmentTypeCounts]);

  function buildFormEmployee(employee) {
    const branchEligibility = (data.employeeBranchRules || [])
      .filter((rule) => rule.empId === employee.id)
      .map((rule) => ({
        branchId: rule.branchId,
        branch_id: rule.branchId,
        canWork: rule.canWork !== false,
        isPreferred: Boolean(rule.isPreferred),
        priority: Number(rule.priority || 0),
        commissionEligible: rule.commissionEligible !== false
      }));
    const payProfile = (data.employeePayProfiles || [])
      .filter((profile) => (profile.empId || profile.employee_id) === employee.id && profile.active !== false && profile.is_active !== false)
      .sort((a, b) => String(b.effectiveFrom || b.effective_from || '').localeCompare(String(a.effectiveFrom || a.effective_from || '')))[0];
    const availabilityRules = (data.employeeAvailabilityRules || [])
      .filter((rule) => rule.empId === employee.id)
      .map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        availabilityType: rule.type || rule.availabilityType,
        note: rule.note || ''
      }));

    return {
      ...employee,
      branchEligibility,
      payProfile: payProfile ? {
        ...payProfile,
        payType: payProfile.payType || payProfile.pay_type,
        pay_type: payProfile.pay_type || payProfile.payType,
        payCycle: payProfile.payCycle || payProfile.pay_cycle || employee.payCycle,
        pay_cycle: payProfile.pay_cycle || payProfile.payCycle || employee.payCycle,
        monthly_salary: payProfile.monthly_salary ?? payProfile.monthlySalary,
        daily_rate: payProfile.daily_rate ?? payProfile.dailyRate,
        commission_rate: payProfile.commission_rate ?? payProfile.commissionRate,
        commissionCalcType: payProfile.commissionCalcType || payProfile.commission_calc_type,
        commission_calc_type: payProfile.commission_calc_type || payProfile.commissionCalcType,
        special_allowance: payProfile.special_allowance ?? payProfile.specialAllowance,
        socialSecurityEnabled: payProfile.socialSecurityEnabled ?? payProfile.social_security_enabled,
        social_security_enabled: payProfile.social_security_enabled ?? payProfile.socialSecurityEnabled,
        effectiveFrom: payProfile.effectiveFrom || payProfile.effective_from,
        effective_from: payProfile.effective_from || payProfile.effectiveFrom
      } : {
        payType: employee.payType,
        payCycle: employee.payCycle,
        monthly_salary: employee.monthlySalary || employee.salary || 0,
        daily_rate: employee.dailyRate || 0,
        commission_rate: employee.commissionRate || 0,
        commission_calc_type: employee.commissionCalcType,
        special_allowance: employee.specialAllowance || 0,
        socialSecurityEnabled: employee.socialSecurityEnabled,
        social_security_enabled: employee.socialSecurityEnabled,
        effectiveFrom: employee.startDate
      },
      availabilityRules
    };
  }

  function openCreate() {
    setModalMode('create');
    setActiveEmployee(null);
    setShowModal(true);
  }

  function openEdit(employee) {
    setModalMode('edit');
    setActiveEmployee(buildFormEmployee(employee));
    setShowModal(true);
  }

  function openView(employee) {
    setModalMode('view');
    setActiveEmployee(employee);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setActiveEmployee(null);
    setModalMode('create');
  }

  async function handleFormSubmit(savedPayload) {
    const id = savedPayload.id;
    const isEdit = Boolean(activeEmployee?.id);
    const result = isEdit
      ? await employeesApi.updateEmployee(activeEmployee.id, savedPayload)
      : await employeesApi.createEmployee(savedPayload);

    if (isEdit) {
      await employeesApi.saveWorkRules(activeEmployee.id, savedPayload);
    }

    const employeeBranchIds = savedPayload.branchEligibility?.map((branch) => branch.branchId || branch.branch_id) || (activeEmployee?.branch ? [activeEmployee.branch] : []);
    const employeeBranchRules = (savedPayload.branchEligibility || []).map((branch, index) => ({
      id: `${id}_${branch.branchId || branch.branch_id}`,
      empId: id,
      branchId: branch.branchId || branch.branch_id,
      canWork: branch.canWork !== false && branch.can_work !== false,
      isPreferred: branch.isPreferred === undefined ? Boolean(branch.is_preferred) : Boolean(branch.isPreferred),
      priority: Number(branch.priority || (index === 0 ? 1 : 0)),
      commissionEligible: branch.commissionEligible === undefined ? branch.commission_eligible !== false : Boolean(branch.commissionEligible),
      note: branch.note || ''
    }));
    const updatedEmployee = {
      id,
      name: savedPayload.name,
      nickname: savedPayload.nickname,
      color: savedPayload.color,
      position: savedPayload.position,
      line_user_id: savedPayload.line_user_id,
      empType: savedPayload.empType || activeEmployee?.empType || 'fulltime',
      branch: savedPayload.branchEligibility?.[0]?.branchId || activeEmployee?.branch || 'b1',
      salary: savedPayload.payProfile?.salary || 0,
      payType: savedPayload.payProfile?.payType || 'monthly',
      payCycle: savedPayload.payProfile?.payCycle || 'monthly',
      breakHours: savedPayload.payProfile?.breakHours || 1,
      commissionEnabled: savedPayload.payProfile?.commissionEnabled || false,
      commissionRate: savedPayload.payProfile?.commission_rate || savedPayload.payProfile?.commissionRate || 0,
      commissionCalcType: savedPayload.payProfile?.commission_calc_type || savedPayload.payProfile?.commissionCalcType || 'scheduled_assigned_branch_days',
      commissionBranches: employeeBranchRules.filter((rule) => rule.commissionEligible).map((rule) => rule.branchId),
      specialAllowance: savedPayload.payProfile?.special_allowance || savedPayload.payProfile?.specialAllowance || 0,
      socialSecurityEnabled: savedPayload.payProfile?.social_security_enabled ?? savedPayload.payProfile?.socialSecurityEnabled ?? true,
      startDate: savedPayload.payProfile?.effectiveFrom || activeEmployee?.startDate || new Date().toISOString().split('T')[0],
      region: savedPayload.regionId || activeEmployee?.region || '',
      phone: savedPayload.phone || ''
    };

    setData((current) => {
      const existingIndex = current.employees.findIndex((employee) => employee.id === id);
      const existingPayProfile = (current.employeePayProfiles || []).find((profile) => (profile.empId || profile.employee_id) === id);
      const savedPayProfile = {
        id: existingPayProfile?.id || `profile_${Date.now()}`,
        empId: id,
        employee_id: id,
        payType: savedPayload.payProfile?.payType,
        pay_type: savedPayload.payProfile?.payType,
        payCycle: savedPayload.payProfile?.payCycle,
        pay_cycle: savedPayload.payProfile?.payCycle,
        monthlySalary: savedPayload.payProfile?.monthlySalary || 0,
        monthly_salary: savedPayload.payProfile?.monthlySalary || 0,
        dailyRate: savedPayload.payProfile?.dailyRate || 0,
        daily_rate: savedPayload.payProfile?.dailyRate || 0,
        commissionEnabled: savedPayload.payProfile?.commissionEnabled,
        commission_enabled: savedPayload.payProfile?.commissionEnabled,
        commissionRate: savedPayload.payProfile?.commission_rate || savedPayload.payProfile?.commissionRate || 0,
        commission_rate: savedPayload.payProfile?.commission_rate || savedPayload.payProfile?.commissionRate || 0,
        commissionCalcType: savedPayload.payProfile?.commission_calc_type || savedPayload.payProfile?.commissionCalcType || 'scheduled_assigned_branch_days',
        commission_calc_type: savedPayload.payProfile?.commission_calc_type || savedPayload.payProfile?.commissionCalcType || 'scheduled_assigned_branch_days',
        specialAllowance: savedPayload.payProfile?.special_allowance || savedPayload.payProfile?.specialAllowance || 0,
        special_allowance: savedPayload.payProfile?.special_allowance || savedPayload.payProfile?.specialAllowance || 0,
        socialSecurityEnabled: savedPayload.payProfile?.social_security_enabled ?? savedPayload.payProfile?.socialSecurityEnabled ?? true,
        social_security_enabled: savedPayload.payProfile?.social_security_enabled ?? savedPayload.payProfile?.socialSecurityEnabled ?? true,
        effectiveFrom: savedPayload.payProfile?.effectiveFrom,
        effective_from: savedPayload.payProfile?.effectiveFrom,
        active: true,
        is_active: true
      };
      const employees = existingIndex >= 0
        ? current.employees.map((employee) => employee.id === id ? { ...employee, ...updatedEmployee } : employee)
        : [...current.employees, updatedEmployee];

      return {
        ...current,
        employees,
        employeeBranches: {
          ...current.employeeBranches,
          [id]: employeeBranchIds
        },
        employeeBranchRules: [
          ...(current.employeeBranchRules || []).filter((rule) => rule.empId !== id),
          ...employeeBranchRules
        ],
        employeePayProfiles: [
          ...(current.employeePayProfiles || []).filter((profile) => (profile.empId || profile.employee_id) !== id),
          savedPayProfile
        ]
      };
    });

    closeModal();
    if (toast) toast(`✅ บันทึกข้อมูลพนักงาน ${updatedEmployee.name} สำเร็จเรียบร้อย!`);
    return { ...savedPayload, ...(result?.data || {}) };
  }

  async function handleDeleteEmployee(employee) {
    const ok = window.confirm(`ลบพนักงาน ${employee.name || employee.id} ใช่ไหม? การลบจะเอาพนักงานออกจากตารางงาน/กติกา/โปรไฟล์เงินเดือนที่เกี่ยวข้อง`);
    if (!ok) return false;

    await employeesApi.deleteEmployee(employee.id);
    setData((current) => {
      const employeeId = employee.id;
      const employeeBranches = { ...(current.employeeBranches || {}) };
      delete employeeBranches[employeeId];
      const leaveBalances = { ...(current.leaveBalances || {}) };
      delete leaveBalances[employeeId];

      return {
        ...current,
        employees: (current.employees || []).filter((item) => item.id !== employeeId),
        employeeBranches,
        employeeBranchRules: (current.employeeBranchRules || []).filter((rule) => rule.empId !== employeeId),
        employeeAvailabilityRules: (current.employeeAvailabilityRules || []).filter((rule) => rule.empId !== employeeId),
        employeeAvailabilityOverrides: (current.employeeAvailabilityOverrides || []).filter((rule) => rule.empId !== employeeId),
        employeePayProfiles: (current.employeePayProfiles || []).filter((profile) => (profile.empId || profile.employee_id) !== employeeId),
        schedule: Object.fromEntries(Object.entries(current.schedule || {}).map(([key, list]) => [key, list.filter((id) => id !== employeeId)])),
        attendance: (current.attendance || []).filter((row) => row.empId !== employeeId),
        attendanceAlerts: (current.attendanceAlerts || []).filter((alert) => alert.empId !== employeeId),
        warningLetters: (current.warningLetters || []).filter((letter) => letter.empId !== employeeId),
        leaves: (current.leaves || []).filter((leave) => leave.empId !== employeeId),
        contracts: (current.contracts || []).filter((contract) => contract.empId !== employeeId),
        leaveBalances
      };
    });

    if (activeEmployee?.id === employee.id) closeModal();
    if (toast) toast(`ลบพนักงาน ${employee.name || employee.id} แล้ว`);
    return true;
  }

  return {
    activeEmployee,
    branches,
    employees,
    modalMode,
    showModal,
    stats,
    closeModal,
    handleFormSubmit,
    handleDeleteEmployee,
    openCreate,
    openEdit,
    openView
  };
}
