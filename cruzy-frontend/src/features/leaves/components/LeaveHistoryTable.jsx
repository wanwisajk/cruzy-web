import { Badge } from './LeaveBadge.jsx';
import { Eye } from 'lucide-react';

export function LeaveHistoryTable({ leaves, employees, onEdit }) {
  return (
    <div className="tw">
      <div className="tw-head processed-head">
        <h3 style={{ color: '#1b5e20' }}>🗃️ ประวัติการลา</h3>
        <span className="count-badge">{leaves.length} รายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
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
                <td colSpan="8" className="empty-row">ยังไม่มีประวัติการลา</td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const employee = employees.find((emp) => emp.id === leave.employee_id);
                return (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{employee?.name || leave.employee_id}</td>
                    <td className="px-4 py-3">{leave.leave_type}</td>
                    <td className="px-4 py-3">{leave.start_date}</td>
                    <td className="px-4 py-3">{leave.end_date}</td>
                    <td className="px-4 py-3">{leave.days_count}</td>
                    <td className="px-4 py-3">{leave.reason || '-'}</td>
                    <td className="px-4 py-3"><Badge status={leave.status} /></td>
                    <td className="px-4 py-3 text-center">
                      {onEdit ? (
                        <button type="button" className="action-btn view" onClick={() => onEdit(leave)} title="ดูรายละเอียด / แก้ไข">
                          <Eye size={14} />
                        </button>
                      ) : null}
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
