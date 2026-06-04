export function LeaveStats({ stats }) {
  return (
    <div className="stats-row">
      <div className="stat-card orange hover:shadow-xl transition-shadow">
        <div className="stat-num">{stats.pending}</div>
        <div className="stat-label">รออนุมัติ</div>
      </div>
      <div className="stat-card hover:shadow-xl transition-shadow" style={{ borderTopColor: '#4caf50' }}>
        <div className="stat-num">{stats.approved}</div>
        <div className="stat-label">อนุมัติแล้ว</div>
      </div>
      <div className="stat-card red hover:shadow-xl transition-shadow">
        <div className="stat-num">{stats.rejected}</div>
        <div className="stat-label">ปฏิเสธแล้ว</div>
      </div>
    </div>
  );
}
