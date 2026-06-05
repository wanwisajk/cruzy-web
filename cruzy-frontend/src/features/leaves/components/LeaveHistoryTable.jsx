import { Eye } from 'lucide-react';

export function LeaveHistoryTable({ rows, onView }) {
  return (
    <div className="tw">
      <div className="tw-head processed-head">
        <h3 style={{ color: '#1b5e20' }}>🗃️ สรุปวันลา (Approved)</h3>
        <span className="count-badge">{rows.length} รายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">พนักงาน</th>
              <th className="px-4 py-3 text-left">ประจำปี (13)</th>
              <th className="px-4 py-3 text-left">🏖 พักร้อน (5)</th>
              <th className="px-4 py-3 text-left">ป่วย</th>
              <th className="px-4 py-3 text-left">กิจ</th>
              <th className="px-4 py-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">ยังไม่มีประวัติการลา</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.summary.annualUsed}/{row.summary.annualQuota}</td>
                  <td className="px-4 py-3">{row.summary.vacationUsed}/{row.summary.vacationQuota}</td>
                  <td className="px-4 py-3">{row.summary.sickUsed}</td>
                  <td className="px-4 py-3">{row.summary.personalUsed}</td>
                  <td className="px-4 py-3 text-center">
                    {onView ? (
                      <button type="button" className="action-btn view" onClick={() => onView(row)} title="ดูรายละเอียด">
                        <Eye size={14} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
