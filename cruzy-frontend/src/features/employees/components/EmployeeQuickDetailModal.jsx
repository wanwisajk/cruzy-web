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
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{ borderTop: `5px solid ${employee.color || "#4CAF50"}` }}>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {employee.name} ({employee.nickname || ""})
            </h2>
            <p className="text-2xs text-gray-400 font-mono mt-0.5">
              {employee.code || employee.id} · {employee.position}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-all">
              แก้ไข
            </button>
            <button type="button" onClick={onDelete} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition-all">
              ลบ
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-semibold">
              &times;
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl space-y-2">
              <DetailRow label="เบอร์โทร" value={employee.phone || "—"} />
              <DetailRow label="สาขาหลัก" value={primaryBranchName} />
              <DetailRow label="สาขาที่วิ่งงานได้" value={branchCodes} valueClassName="font-semibold text-emerald-700" />
              <DetailRow label="ประเภทสัญญา" value={statusLabel(employee.empType || "fulltime")} />
            </div>
            <div className="bg-gray-50 p-3 rounded-xl space-y-2">
              <DetailRow label="รูปแบบค่าจ้าง" value={payCycleLabel(employee.payType)} />
              <DetailRow label="ฐานรายได้" value={`฿${nf(employee.monthlySalary || employee.salary || employee.dailyRate)}`} valueClassName="font-bold text-gray-900" />
              <DetailRow label="เบี้ยเลี้ยงพิเศษ" value={`฿${nf(employee.specialAllowance || 0)}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueClassName = "font-semibold" }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}:</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
