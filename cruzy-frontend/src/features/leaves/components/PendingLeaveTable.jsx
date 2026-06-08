import { Badge } from "./LeaveBadge.jsx";
import { Check, X, Eye, Hourglass } from "lucide-react";

export function PendingLeaveTable({
  leaves,
  employees,
  onApprove,
  onReject,
  onEdit,
}) {
  return (
    <div className="table-shell pending-zone">
      <div className="table-toolbar">
        <div className="flex items-center gap-2">
          <Hourglass size={16} />
          <h3 className="table-title">รายการขอลาที่ยังไม่ได้อนุมัติ</h3>
        </div>
        <span className="count-pill">{leaves.length} รายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse body-text">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">พนักงาน</th>
              <th className="px-4 py-3 text-left">ประเภทการลา</th>
              <th className="px-4 py-3 text-left">วันที่เริ่ม</th>
              <th className="px-4 py-3 text-left">วันที่สิ้นสุด</th>
              <th className="px-4 py-3 text-left">จำนวนวัน</th>
              <th className="px-4 py-3 text-left">เหตุผล</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  ไม่มีคำขอลาค้างอยู่
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const employee = employees.find(
                  (emp) => String(emp.id) === String(leave.employee_id),
                );
                return (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="body-strong">
                          {employee?.name || leave.employee_id}
                        </span>
                        <span className="caption text-slate-500">
                          {employee?.position || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{leave.leave_type}</td>
                    <td className="px-4 py-3">{leave.start_date}</td>
                    <td className="px-4 py-3">{leave.end_date}</td>
                    <td className="px-4 py-3">{leave.days_count}</td>
                    <td className="px-4 py-3">{leave.reason || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge status="pending">Pending</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="action-cluster">
                      {onEdit ? (
                        <button
                          type="button"
                          className="icon-action"
                          onClick={() => onEdit(leave)}
                          title="ดูรายละเอียด / แก้ไข"
                        >
                          <Eye size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="icon-action success"
                        onClick={() => onApprove(leave)}
                        title="อนุมัติ"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-action danger"
                        onClick={() => onReject(leave)}
                        title="ปฏิเสธ"
                      >
                        <X size={14} />
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
