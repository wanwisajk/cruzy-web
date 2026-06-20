import { useState } from "react";
import { LeaveDashboardContent } from "../features/leaves/components/LeaveDashboardContent.jsx";
import { LeaveDashboardHeader } from "../features/leaves/components/LeaveDashboardHeader.jsx";
import { LeaveModal } from "../features/leaves/components/LeaveModal.jsx";
import { useLeaveDashboardData } from "../features/leaves/hooks/useLeaveDashboardData.js";
import { useLeaves } from "../features/leaves/hooks/useLeaves.js";

export default function LeaveDashboard({ data, currentBranch }) {
  const {
    leaves,
    loading,
    saving,
    error,
    createLeave,
    updateLeave,
    getLeaveDetail,
  } = useLeaves();
  const [filters, setFilters] = useState({
    leaveType: "",
    status: "",
    month: "",
    search: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [approvedSummaryOpen, setApprovedSummaryOpen] = useState(false);
  const [approvedSummaryEmployee, setApprovedSummaryEmployee] = useState(null);
  const {
    approvedSummary,
    leaveTypes,
    months,
    pendingLeaves,
    stats,
    visibleEmployees,
  } = useLeaveDashboardData({ data, currentBranch, filters, leaves });

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setEditingLeave(null);
    setModalOpen(true);
  }

  async function handleApproveLeave(leave) {
    await updateLeave(leave.id, { status: "approved" });
  }

  async function handleRejectLeave(leave) {
    await updateLeave(leave.id, { status: "rejected" });
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

  async function handleEditLeave(leave) {
    const hasAttachments = Array.isArray(leave.attachments);
    const detailedLeave = hasAttachments ? leave : await getLeaveDetail(leave.id);
    setEditingLeave(detailedLeave);
    setModalOpen(true);
  }

  async function handleViewApprovedSummary(row) {
    const approvedLeaves = await Promise.all(
      row.approvedLeaves.map(async (leave) => {
        if (Array.isArray(leave.attachments)) return leave;
        return getLeaveDetail(leave.id);
      }),
    );
    setApprovedSummaryEmployee({ ...row, approvedLeaves });
    setApprovedSummaryOpen(true);
  }

  return (
    <div className="app-page page-body content">
      <LeaveDashboardHeader onCreate={openCreateModal} />

      {error ? <div className="alert-bar warn">{error}</div> : null}

      <LeaveDashboardContent
        approvedSummary={approvedSummary}
        approvedSummaryEmployee={approvedSummaryEmployee}
        approvedSummaryOpen={approvedSummaryOpen}
        employees={visibleEmployees}
        filters={filters}
        leaveTypes={leaveTypes}
        loading={loading}
        months={months}
        onApprove={handleApproveLeave}
        onCloseApprovedSummary={() => setApprovedSummaryOpen(false)}
        onEdit={handleEditLeave}
        onFilterChange={handleFilterChange}
        onReject={handleRejectLeave}
        onViewApprovedSummary={handleViewApprovedSummary}
        pendingLeaves={pendingLeaves}
        stats={stats}
      />

      <LeaveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        employees={visibleEmployees}
        leave={editingLeave}
        saving={saving}
        leaveTypeOptions={leaveTypes}
      />
    </div>
  );
}
