import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { LeaveStats } from '../features/leaves/components/LeaveStats.jsx';
import { LeaveFilters } from '../features/leaves/components/LeaveFilters.jsx';
import { PendingLeaveTable } from '../features/leaves/components/PendingLeaveTable.jsx';
import { LeaveHistoryTable } from '../features/leaves/components/LeaveHistoryTable.jsx';
import { ApprovedLeaveHistoryModal } from '../features/leaves/components/ApprovedLeaveHistoryModal.jsx';
import { LeaveModal } from '../features/leaves/components/LeaveModal.jsx';
import { useLeaves } from '../features/leaves/hooks/useLeaves.js';

const DEFAULT_LEAVE_TYPES = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาอื่นๆ'];

export default function LeaveDashboard({ data, currentBranch }) {
  const { leaves, loading, saving, error, createLeave, updateLeave, deleteLeave } = useLeaves();
  const [filters, setFilters] = useState({ leaveType: '', status: '', month: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [approvedSummaryOpen, setApprovedSummaryOpen] = useState(false);
  const [approvedSummaryEmployee, setApprovedSummaryEmployee] = useState(null);
  const [confirmationLeave, setConfirmationLeave] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const visibleEmployees = useMemo(() => {
    if (!data) return [];
    return data.employees.filter((employee) => currentBranch === 'all' || employee.branch === currentBranch);
  }, [data, currentBranch]);

  const visibleEmployeeIds = useMemo(() => visibleEmployees.map((employee) => employee.id), [visibleEmployees]);

  const leaveBalances = useMemo(() => data?.leaveBalances || {}, [data]);
  const visibleEmployeeBalances = useMemo(() => {
    return visibleEmployees.map((employee) => ({
      ...employee,
      leaveBalance: leaveBalances[employee.id] || {
        annualQuota: 0,
        annualUsed: 0,
        vacationQuota: 0,
        vacationUsed: 0,
        personalQuota: 0,
        personalUsed: 0,
        sickUsed: 0
      }
    }));
  }, [visibleEmployees, leaveBalances]);

  const filteredLeaves = useMemo(() => {
    return leaves
      .filter((leave) => visibleEmployeeIds.includes(leave.employee_id))
      .filter((leave) => (filters.leaveType ? leave.leave_type === filters.leaveType : true))
      .filter((leave) => (filters.status ? leave.status === filters.status : true))
      .filter((leave) => {
        if (!filters.month) return true;
        const date = new Date(leave.start_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filters.month;
      })
      .filter((leave) => {
        const value = filters.search.trim().toLowerCase();
        if (!value) return true;
        return [leave.leave_type, leave.reason].some((field) => String(field || '').toLowerCase().includes(value));
      });
  }, [leaves, visibleEmployeeIds, filters]);

  const pendingLeaves = filteredLeaves.filter((leave) => leave.status === 'pending');
  const approvedLeaves = filteredLeaves.filter((leave) => leave.status === 'approved');

  const approvedSummary = useMemo(() => {
    return visibleEmployees
      .map((employee) => {
        const employeeLeaves = approvedLeaves.filter((leave) => leave.employee_id === employee.id);
        if (!employeeLeaves.length) return null;

        const totals = employeeLeaves.reduce((sum, leave) => {
          const type = String(leave.leave_type || '').toLowerCase();
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
        }, { annual: 0, vacation: 0, sick: 0, personal: 0 });

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
            personalUsed: totals.personal
          }
        };
      })
      .filter(Boolean);
  }, [approvedLeaves, leaveBalances, visibleEmployees]);

  const historyLeaves = approvedSummary;

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
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));
      }
    });
    return Array.from(monthsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [leaves]);

  const stats = {
    pending: leaves.filter((leave) => leave.status === 'pending' && visibleEmployeeIds.includes(leave.employee_id)).length,
    approved: leaves.filter((leave) => leave.status === 'approved' && visibleEmployeeIds.includes(leave.employee_id)).length,
    rejected: leaves.filter((leave) => leave.status === 'rejected' && visibleEmployeeIds.includes(leave.employee_id)).length
  };

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setEditingLeave(null);
    setModalOpen(true);
  }

  async function handleApproveLeave(leave) {
    await updateLeave(leave.id, { status: 'approved' });
  }

  async function handleRejectLeave(leave) {
    await updateLeave(leave.id, { status: 'rejected' });
  }

  async function handleSave(payload) {
    if (editingLeave) {
      await updateLeave(editingLeave.id, payload);
    } else {
      await createLeave(payload);
    }
    setModalOpen(false);
    setEditingLeave(null);
  }

  function handleEditLeave(leave) {
    setEditingLeave(leave);
    setModalOpen(true);
  }

  function handleViewApprovedSummary(row) {
    setApprovedSummaryEmployee(row);
    setApprovedSummaryOpen(true);
  }

  function handleCancelLeave(leave) {
    setConfirmationLeave(leave);
    setConfirmationOpen(true);
  }

  async function confirmCancelLeave() {
    if (!confirmationLeave) return;
    await deleteLeave(confirmationLeave.id);
    setConfirmationLeave(null);
    setConfirmationOpen(false);
  }

  function closeConfirmation() {
    setConfirmationOpen(false);
    setConfirmationLeave(null);
  }

  const tableEmployees = useMemo(() => visibleEmployees, [visibleEmployees]);

  return (
    <div className="content">
      <div className="content-header">
        <h2>📅 ระบบลาของพนักงาน</h2>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> ขอวันลา
        </button>
      </div>

      {error ? <div className="alert-bar warn">{error}</div> : null}

      <LeaveStats stats={stats} />

      <div className="mt-4">
        <LeaveFilters filters={filters} leaveTypes={leaveTypes} months={months} onChange={handleFilterChange} />
      </div>

     

      {loading ? (
        <div className="card p-6 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin" size={28} />
          กำลังโหลดข้อมูลการลา...
        </div>
      ) : (
        <>
          <PendingLeaveTable
            leaves={pendingLeaves}
            employees={tableEmployees}
            onApprove={handleApproveLeave}
            onReject={handleRejectLeave}
            onEdit={handleEditLeave}
          />
          <div className="mt-4">
            <LeaveHistoryTable rows={historyLeaves} employees={tableEmployees} onView={handleViewApprovedSummary} />
          </div>
          <ApprovedLeaveHistoryModal
            open={approvedSummaryOpen}
            onClose={() => setApprovedSummaryOpen(false)}
            employee={approvedSummaryEmployee}
          />
        </>
      )}

      <LeaveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        employees={tableEmployees}
        leave={editingLeave}
        saving={saving}
        leaveTypeOptions={leaveTypes}
      />

      <div className={`overlay ${confirmationOpen ? 'open' : ''}`} onClick={(event) => event.target === event.currentTarget && closeConfirmation()}>
        <div className="modal">
          <div className="m-head">
            <h2>ยืนยันการยกเลิกคำขอ</h2>
            <button type="button" className="m-close" onClick={closeConfirmation}>&times;</button>
          </div>
          <div className="m-body space-y-3">
            <p>คุณแน่ใจหรือไม่ ว่าต้องการยกเลิกคำขอลานี้?</p>
            <p className="text-sm text-slate-500">คำขอนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้</p>
          </div>
          <div className="m-foot">
            <button type="button" className="btn btn-ghost" onClick={closeConfirmation}>ปิด</button>
            <button type="button" className="btn btn-primary" onClick={confirmCancelLeave}>ยืนยัน</button>
          </div>
        </div>
      </div>
    </div>
  );
}
