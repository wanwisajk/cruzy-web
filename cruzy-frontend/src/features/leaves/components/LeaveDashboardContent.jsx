import { ApprovedLeaveHistoryModal } from "./ApprovedLeaveHistoryModal.jsx";
import { LeaveFilters } from "./LeaveFilters.jsx";
import { LeaveHistoryTable } from "./LeaveHistoryTable.jsx";
import { LeaveLoadingState } from "./LeaveLoadingState.jsx";
import { LeaveStats } from "./LeaveStats.jsx";
import { PendingLeaveTable } from "./PendingLeaveTable.jsx";
import { ResolvedLeaveTable } from "./ResolvedLeaveTable.jsx";

export function LeaveDashboardContent({
  approvedSummary,
  approvedSummaryEmployee,
  approvedSummaryOpen,
  employees,
  filters,
  leaveTypes,
  loading,
  months,
  onApprove,
  onCloseApprovedSummary,
  onEdit,
  onFilterChange,
  onReject,
  onViewApprovedSummary,
  pendingLeaves,
  resolvedLeaves,
  stats,
}) {
  return (
    <>
      <LeaveStats stats={stats} />

      <div className="mt-4">
        <LeaveFilters
          filters={filters}
          leaveTypes={leaveTypes}
          months={months}
          onChange={onFilterChange}
        />
      </div>

      {loading ? (
        <LeaveLoadingState />
      ) : (
        <>
          <PendingLeaveTable
            leaves={pendingLeaves}
            employees={employees}
            onApprove={onApprove}
            onReject={onReject}
            onEdit={onEdit}
          />
          <div className="mt-4">
            <ResolvedLeaveTable
              leaves={resolvedLeaves}
              employees={employees}
              onEdit={onEdit}
            />
          </div>
          <div className="mt-4">
            <LeaveHistoryTable
              rows={approvedSummary}
              employees={employees}
              onView={onViewApprovedSummary}
            />
          </div>
          <ApprovedLeaveHistoryModal
            open={approvedSummaryOpen}
            onClose={onCloseApprovedSummary}
            employee={approvedSummaryEmployee}
          />
        </>
      )}
    </>
  );
}
