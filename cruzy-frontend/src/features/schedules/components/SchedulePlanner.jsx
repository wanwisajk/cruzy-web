import { thaiShortDate } from "../../../lib/date";
import { recommendedEmployees, requiredStaffFor, shiftFor } from "../../../lib/schedule";
import { ScheduleAvatar } from "./ScheduleAvatar";
import { ScheduleStatCard } from "./ScheduleStatCard";

export function SchedulePlanner({
  data,
  branches,
  days,
  today,
  from,
  to,
  user,
  alerts,
  dragOverCell,
  setDragOverCell,
  onAssign,
  onAutoFill,
  onQuickAdd,
  onRemove,
  onDragStart,
  onCellDragOver,
  onCellDrop,
  onViewAllAlerts,
  loading,
}) {
  const stats = branches.reduce(
    (acc, branch) => {
      const employees = data.schedule[`${branch.id}_${today}`] || [];
      const need = requiredStaffFor(data, branch.id, today);
      acc.total += employees.length;
      if (!employees.length) acc.empty += 1;
      if (employees.length < need) acc.short += 1;
      return acc;
    },
    { total: 0, empty: 0, short: 0 },
  );
  const tableMinWidth = 72 + days.length * 92;

  return (
    <div className="space-y-4 p-5">
      {loading ? <div className="alert-bar">กำลังซิงก์ตารางงานล่าสุด...</div> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScheduleStatCard label="เข้างานวันนี้" value={stats.total} accent="green" />
        <ScheduleStatCard label="แจ้งเตือน" value={alerts.length} accent="blue" />
        <ScheduleStatCard label="สาขาว่าง" value={stats.empty} accent={stats.empty ? "red" : "green"} />
        <ScheduleStatCard label="คนไม่พอ" value={stats.short} accent={stats.short ? "amber" : "green"} />
      </div>

      <AlertStack alerts={alerts} onAssign={onAssign} onViewAllAlerts={onViewAllAlerts} />

      <RecommendationBox
        data={data}
        branches={branches}
        days={days}
        from={from}
        to={to}
        user={user}
        onQuickAdd={onQuickAdd}
        onAutoFill={onAutoFill}
      />

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead>
              <tr>
                <th className="w-[72px] border-b border-r-2 border-gray-100 border-r-emerald-500 bg-gray-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  สาขา
                </th>
                {days.map((date) => {
                  const day = new Date(`${date}T00:00:00`);
                  const isToday = date === today;
                  return (
                    <th
                      key={date}
                      className={`w-[92px] border-b border-gray-100 px-2 py-2.5 text-center ${
                        isToday ? "border-b-emerald-200 bg-emerald-50" : "bg-gray-50"
                      }`}
                    >
                      <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-emerald-600" : "text-gray-400"}`}>
                        {day.toLocaleDateString("th-TH", { weekday: "short" })}
                      </div>
                      <div className={`mt-0.5 text-[15px] font-bold ${isToday ? "text-emerald-600" : "text-gray-700"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <ScheduleRow
                  key={branch.id}
                  data={data}
                  branch={branch}
                  days={days}
                  today={today}
                  dragOverCell={dragOverCell}
                  setDragOverCell={setDragOverCell}
                  onAssign={onAssign}
                  onRemove={onRemove}
                  onDragStart={onDragStart}
                  onCellDragOver={onCellDragOver}
                  onCellDrop={onCellDrop}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({
  data,
  branch,
  days,
  today,
  dragOverCell,
  setDragOverCell,
  onAssign,
  onRemove,
  onDragStart,
  onCellDragOver,
  onCellDrop,
}) {
  return (
    <tr>
      <td className="w-[72px] whitespace-nowrap border-b border-r-2 border-gray-100 border-r-emerald-500 bg-white px-3 py-2 align-middle text-[11px] font-bold text-gray-800">
        {branch.code}
      </td>
      {days.map((date) => {
        const cellKey = `${branch.id}_${date}`;
        const employeeIds = data.schedule[cellKey] || [];
        const need = requiredStaffFor(data, branch.id, date);
        const empty = employeeIds.length === 0 && need > 0;
        const short = employeeIds.length > 0 && employeeIds.length < need;
        const ok = employeeIds.length >= need;
        const shift = shiftFor(data, branch.id, date);
        const bgClass = empty
          ? "bg-red-50"
          : short
            ? "bg-orange-50"
            : date === today
              ? "bg-emerald-50/60"
              : "bg-white";
        const needBadgeClass = empty
          ? "bg-red-100 text-red-700"
          : short
            ? "bg-orange-100 text-orange-700"
            : "bg-gray-100 text-gray-500";

        return (
          <td
            key={cellKey}
            className={`w-[92px] border-b border-l border-gray-100 p-2 align-top transition ${bgClass} ${
              dragOverCell === cellKey ? "ring-2 ring-emerald-500/60 ring-inset" : ""
            }`}
            onDragOver={onCellDragOver}
            onDragEnter={() => setDragOverCell(cellKey)}
            onDragLeave={() => setDragOverCell((current) => (current === cellKey ? "" : current))}
            onDrop={(event) => onCellDrop(event, branch.id, date)}
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${needBadgeClass}`}>{need} คน</span>
              {shift.start ? (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
                  {shift.start}
                  {shift.end ? ` - ${shift.end}` : ""}
                </span>
              ) : null}
            </div>

            <div className="min-h-[22px] space-y-1">
              {employeeIds.map((empId) => {
                const employee = data.employees.find((item) => item.id === empId);
                if (!employee) return null;
                return (
                  <div
                    key={empId}
                    draggable
                    onDragStart={(event) => onDragStart(event, branch.id, date, empId)}
                    onDragEnd={() => setDragOverCell("")}
                    className="flex items-center gap-1 rounded-full border border-gray-100 bg-white px-2 py-0.5 shadow-sm"
                  >
                    <ScheduleAvatar employee={employee} size="sm" />
                    <span className="flex-1 truncate text-[10px] font-semibold text-gray-800">
                      {employee.nickname || employee.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(branch.id, date, empId)}
                      className="text-[11px] leading-none text-red-300 hover:text-red-500"
                      aria-label="ลบ"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onAssign({ branchId: branch.id, date })}
              className="mt-1.5 w-full rounded-lg bg-emerald-50 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              + เพิ่ม
            </button>

            <div className="mt-1 flex justify-end">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${ok ? "bg-emerald-600" : "bg-red-500"}`}>
                {employeeIds.length}/{need}
              </span>
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function AlertStack({ alerts, onAssign, onViewAllAlerts }) {
  if (!alerts.length) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-700">แจ้งเตือน</h3>
        <button
          type="button"
          onClick={onViewAllAlerts}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-gray-200"
        >
          ดูทั้งหมด
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={`${alert.type}_${alert.branch.id}_${alert.date}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${
              alert.type === "danger" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-orange-50 text-amber-700"
            }`}
          >
            <span className="flex-1">{alert.message}</span>
            <button
              type="button"
              onClick={() => onAssign({ branchId: alert.branch.id, date: alert.date })}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                alert.type === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              จัดคน
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationBox({ data, branches, days, from, to, user, onQuickAdd, onAutoFill }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            แนะนำจัดตารางตามกติกา
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            กรองจากสาขาที่ลงได้ วันว่าง ไม่ชนตารางเดิม และกระจายจำนวนวันทำงาน
          </p>
        </div>
        <button type="button" onClick={onAutoFill} className="btn btn-primary">
          จัดอัตโนมัติ
        </button>
      </div>
      <div className="space-y-1.5">
        {branches.map((branch) => {
          const recs = days
            .flatMap((date) =>
              recommendedEmployees(data, user, branch.id, date, { from, to }).map((candidate) => ({
                ...candidate,
                date,
              })),
            )
            .slice(0, 5);

          return (
            <div key={branch.id} className="flex flex-wrap items-center gap-1 text-xs">
              <span className="w-10 font-bold text-gray-700">{branch.code}</span>
              <span className="text-gray-400">→</span>
              {recs.length ? (
                recs.map((rec) => (
                  <button
                    key={`${rec.employee.id}_${rec.date}`}
                    type="button"
                    onClick={() => onQuickAdd(branch.id, rec.date, rec.employee.id)}
                    className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 font-semibold text-gray-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    <ScheduleAvatar employee={rec.employee} size="sm" />
                    {rec.employee.nickname || rec.employee.name} · {thaiShortDate(rec.date)}
                  </button>
                ))
              ) : (
                <span className="text-gray-400">ไม่มีช่องว่าง</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
