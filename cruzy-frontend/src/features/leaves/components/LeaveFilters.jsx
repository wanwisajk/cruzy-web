export function LeaveFilters({ filters, leaveTypes, months, onChange }) {
  return (
    <div className="tw mb-4">
      <div className="tw-head" style={{ padding: '16px 18px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>ฟิลเตอร์</h3>
      </div>
      <div className="m-body grid gap-4 md:grid-cols-4">
        <label className="space-y-2 body-text">
          <div className="body-strong text-slate-700">ประเภทการลา</div>
          <select value={filters.leaveType} onChange={(e) => onChange('leaveType', e.target.value)} className="input">
            <option value="">ทั้งหมด</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 body-text">
          <div className="body-strong text-slate-700">สถานะ</div>
          <select value={filters.status} onChange={(e) => onChange('status', e.target.value)} className="input">
            <option value="">ทั้งหมด</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="space-y-2 body-text">
          <div className="body-strong text-slate-700">เดือน</div>
          <select value={filters.month} onChange={(e) => onChange('month', e.target.value)} className="input">
            <option value="">ทั้งหมด</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 body-text">
          <div className="body-strong text-slate-700">ค้นหา</div>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            placeholder="ค้นหาเหตุผล หรือ ประเภทการลา"
            className="input"
          />
        </label>
      </div>
    </div>
  );
}
