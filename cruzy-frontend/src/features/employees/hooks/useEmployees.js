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

  function openCreate() {
    setModalMode('create');
    setActiveEmployee(null);
    setShowModal(true);
  }

  function openEdit(employee) {
    setModalMode('edit');
    setActiveEmployee(employee);
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
      startDate: savedPayload.payProfile?.effectiveFrom || activeEmployee?.startDate || new Date().toISOString().split('T')[0],
      region: savedPayload.regionId || activeEmployee?.region || '',
      phone: savedPayload.phone || ''
    };

    setData((current) => {
      const existingIndex = current.employees.findIndex((employee) => employee.id === id);
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
        employeePayProfiles: existingIndex >= 0 ? current.employeePayProfiles : [...(current.employeePayProfiles || []), {
          id: `profile_${Date.now()}`,
          employee_id: id,
          pay_type: savedPayload.payProfile?.payType,
          monthly_salary: savedPayload.payProfile?.monthlySalary || 0,
          daily_rate: savedPayload.payProfile?.dailyRate || 0,
          commission_enabled: savedPayload.payProfile?.commissionEnabled,
          effective_from: savedPayload.payProfile?.effectiveFrom,
          is_active: true
        }]
      };
    });

    closeModal();
    if (toast) toast(`✅ บันทึกข้อมูลพนักงาน ${updatedEmployee.name} สำเร็จเรียบร้อย!`);
    return { ...savedPayload, ...(result?.data || {}) };
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
    openCreate,
    openEdit,
    openView
  };
}
