import { nf, payCycleLabel, statusLabel } from "../lib/employeePageUtils";

export function EmployeeQuickDetailModal({ employee, data, onClose, onEdit, onDelete }) {
  if (!employee) return null;

  const primaryBranchName = data.branches?.find((branch) => branch.id === employee.branch)?.name || "—";
  const branchCodes = (data.employeeBranches?.[employee.id] || [])
    .map((branchId) => data.branches?.find((branch) => branch.id === branchId)?.code)
    .filter(Boolean)
    .join(", ") || "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="surface-modal max-w-3xl overflow-hidden max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{ borderTop: `5px solid ${employee.color || "#4CAF50"}` }}>
          <div>
            <h2 className="heading-3 text-gray-900">
              {employee.name} ({employee.nickname || ""})
            </h2>
            <p className="caption text-gray-400 font-mono mt-0.5">
              {employee.code || employee.id} · {employee.position}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="btn btn-secondary btn-sm">
              แก้ไข
            </button>
            <button type="button" onClick={onDelete} className="btn btn-danger btn-sm">
              ลบ
            </button>
            <button onClick={onClose} className="icon-btn">
              &times;
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto body-text">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="section-card-soft space-y-2">
              <DetailRow label="เบอร์โทร" value={employee.phone || "—"} />
              <DetailRow label="สาขาหลัก" value={primaryBranchName} />
              <DetailRow label="สาขาที่วิ่งงานได้" value={branchCodes} valueClassName="body-strong text-emerald-700" />
              <DetailRow label="ประเภทสัญญา" value={statusLabel(employee.empType || "fulltime")} />
            </div>
            <div className="section-card-soft space-y-2">
              <DetailRow label="รูปแบบค่าจ้าง" value={payCycleLabel(employee.payType)} />
              <DetailRow label="ฐานรายได้" value={`฿${nf(employee.monthlySalary || employee.salary || employee.dailyRate)}`} valueClassName="body-strong text-gray-900" />
              <DetailRow label="เบี้ยเลี้ยงพิเศษ" value={`฿${nf(employee.specialAllowance || 0)}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueClassName = "body-strong" }) {
  return (
    <div className="data-pair">
      <span className="data-pair-label">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
