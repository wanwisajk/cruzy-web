import { useMemo, useState } from "react";
import { dateRange, fmtDate, thaiShortDate } from "../lib/date";
import {
  getVisibleBranches,
  recommendedEmployees,
  requiredStaffFor,
  scheduleCandidates,
  shiftFor,
} from "../lib/schedule";
import { useSchedule } from "../features/schedules/hooks/useSchedule";
import BranchSettingsSection from "../features/schedules/components/BranchSettingsSection";
import OverviewSection from "../features/schedules/components/OverviewSection";
import AllAlertsPage from "../features/schedules/components/AllAlertsPage";
import { X } from "lucide-react";

export default function ScheduleDashboard({
  data,
  setData,
  user,
  currentBranch,
  from,
  to,
  toast,
  onRefreshData,
}) {
  const [view, setView] = useState("planner");
  const [assignTarget, setAssignTarget] = useState(null);
  const [dragOverCell, setDragOverCell] = useState("");
  const { schedule, loading, error, assignSchedule, removeSchedule } =
    useSchedule(data.schedule, setData);
  const scheduleData = useMemo(() => ({ ...data, schedule }), [data, schedule]);
  const branches = useMemo(
    () => getVisibleBranches(scheduleData, user, currentBranch),
    [scheduleData, user, currentBranch],
  );
  const days = useMemo(() => dateRange(from, to).slice(0, 30), [from, to]);
  const today = fmtDate(new Date());
  const alerts = useMemo(
    () => buildAlerts(scheduleData, branches, from),
    [scheduleData, branches, from],
  );

  function handleEmployeeDragStart(event, branchId, date, empId) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ empId, branchId, date }),
    );
  }

  function handleCellDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleCellDrop(event, targetBranchId, targetDate) {
    event.preventDefault();
    setDragOverCell("");
    try {
      const payload = JSON.parse(
        event.dataTransfer.getData("application/json"),
      );
      if (!payload?.empId) return;
      const { empId, branchId: sourceBranchId, date: sourceDate } = payload;
      if (sourceBranchId === targetBranchId && sourceDate === targetDate)
        return;
      moveSchedule(
        empId,
        sourceBranchId,
        sourceDate,
        targetBranchId,
        targetDate,
      );
    } catch (error) {
      console.error("Drop failed", error);
    }
  }

  async function moveSchedule(
    empId,
    sourceBranchId,
    sourceDate,
    targetBranchId,
    targetDate,
  ) {
    const removed = await removeFromSchedule(sourceBranchId, sourceDate, empId);
    if (!removed) return;
    const added = await addToSchedule(targetBranchId, targetDate, empId);
    if (!added) {
      await addToSchedule(sourceBranchId, sourceDate, empId);
      toast("ย้ายไม่สำเร็จ จึงคืนตารางเดิมให้แล้ว", "error");
    }
  }

  async function addToSchedule(branchId, date, empId) {
    const normalizedEmpId = String(empId);
    const employee = scheduleData.employees.find((item) => String(item.id) === normalizedEmpId);
    const branch = scheduleData.branches.find((item) => String(item.id) === String(branchId));
    try {
      const shift = shiftFor(scheduleData, branchId, date);
      await assignSchedule({
        branchId,
        date,
        employeeId: normalizedEmpId,
        shiftStart: shift.start,
        shiftEnd: shift.end,
      });
      toast(
        `เพิ่ม ${employee?.name || "พนักงาน"} → ${branch?.code || ""} ${thaiShortDate(date)}`,
      );
      return true;
    } catch (error) {
      toast(error.message || "เพิ่มตารางงานไม่สำเร็จ", "error");
      return false;
    }
  }

  async function removeFromSchedule(branchId, date, empId) {
    try {
      await removeSchedule({ branchId, date, employeeId: empId });
      toast("ลบออกจากตารางแล้ว");
      return true;
    } catch (error) {
      toast(error.message || "ลบตารางงานไม่สำเร็จ", "error");
      return false;
    }
  }

  async function autoFill() {
    let added = 0;
    let workingSchedule = scheduleData.schedule;
    for (const [dayIndex, date] of days.entries()) {
      let workingData = { ...scheduleData, schedule: workingSchedule };
      const branchesByNeed = [...branches]
        .sort((a, b) => {
          const aExisting = workingData.schedule[`${a.id}_${date}`] || [];
          const bExisting = workingData.schedule[`${b.id}_${date}`] || [];
          const aShortage = Math.max(0, requiredStaffFor(workingData, a.id, date) - aExisting.length);
          const bShortage = Math.max(0, requiredStaffFor(workingData, b.id, date) - bExisting.length);
          if (bShortage !== aShortage) return bShortage - aShortage;
          const aCandidates = recommendedEmployees(workingData, user, a.id, date, { from, to }).length;
          const bCandidates = recommendedEmployees(workingData, user, b.id, date, { from, to }).length;
          if (aCandidates !== bCandidates) return aCandidates - bCandidates;
          return 0;
        });
      const rotatedBranches = branchesByNeed.length
        ? [...branchesByNeed.slice(dayIndex % branchesByNeed.length), ...branchesByNeed.slice(0, dayIndex % branchesByNeed.length)]
        : branchesByNeed;

      for (const branch of rotatedBranches) {
        const workingData = { ...scheduleData, schedule: workingSchedule };
        let existing = workingData.schedule[`${branch.id}_${date}`] || [];
        const need = requiredStaffFor(workingData, branch.id, date);
        while (existing.length < need) {
          const rec = recommendedEmployees(
            { ...scheduleData, schedule: workingSchedule },
            user,
            branch.id,
            date,
            { from, to },
          )[0];
          if (!rec) break;
          const saved = await addToSchedule(branch.id, date, rec.employee.id);
          if (!saved) break;
          added += 1;
          existing = [...existing.map(String), String(rec.employee.id)];
          workingSchedule = {
            ...workingSchedule,
            [`${branch.id}_${date}`]: existing,
          };
        }
      }
    }
    toast(
      added
        ? `จัดอัตโนมัติแล้ว ${added} รายการ`
        : "ยังไม่มีรายการที่จัดเพิ่มได้",
    );
  }

  const tabs = [
    { id: "planner", label: "จัดตาราง" },
    { id: "alerts", label: "แจ้งเตือนทั้งหมด" },
    { id: "overview", label: "ภาพรวม" },
    { id: "branches", label: "ตั้งค่าสาขา" },
  ];

  return (
    <div id="content-area" className="relative flex-1 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-6 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 transition-all ${view === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="mx-5 mt-5 alert-bar warn">{error}</div> : null}
      {view === "planner" ? (
        <Planner
          data={scheduleData}
          branches={branches}
          days={days}
          today={today}
          from={from}
          to={to}
          user={user}
          alerts={alerts}
          dragOverCell={dragOverCell}
          setDragOverCell={setDragOverCell}
          onAssign={setAssignTarget}
          onAutoFill={autoFill}
          onQuickAdd={addToSchedule}
          onRemove={removeFromSchedule}
          onDragStart={handleEmployeeDragStart}
          onCellDragOver={handleCellDragOver}
          onCellDrop={handleCellDrop}
          onViewAllAlerts={() => setView("alerts")}
          loading={loading}
        />
      ) : view === "overview" ? (
        <div className="p-5">
          <OverviewSection
            data={scheduleData}
            branches={branches}
            date={from}
            onAssign={setAssignTarget}
          />
        </div>
      ) : view === "alerts" ? (
        <div className="flex flex-col h-full">
          <AllAlertsPage alerts={alerts} onAssign={setAssignTarget} onClose={() => setView("planner")} />
        </div>
      ) : (
        <div className="p-5">
          <BranchSettingsSection onRefreshData={onRefreshData} />
        </div>
      )}

      <AssignModal
        target={assignTarget}
        data={scheduleData}
        user={user}
        from={from}
        to={to}
        onClose={() => setAssignTarget(null)}
        onAdd={async (branchId, date, empId) => {
          await addToSchedule(branchId, date, empId);
          setAssignTarget(null);
        }}
      />
    </div>
  );
}

function Planner({
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
    <div className="p-5 space-y-4">
      {loading ? (
        <div className="alert-bar">กำลังซิงก์ตารางงานล่าสุด...</div>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="เข้างานวันนี้" value={stats.total} accent="green" />
        <StatCard label="แจ้งเตือน" value={alerts.length} accent="blue" />
        <StatCard
          label="สาขาว่าง"
          value={stats.empty}
          accent={stats.empty ? "red" : "green"}
        />
        <StatCard
          label="คนไม่พอ"
          value={stats.short}
          accent={stats.short ? "amber" : "green"}
        />
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed border-collapse"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead>
              <tr>
                <th className="bg-gray-50 border-b border-gray-100 border-r-2 border-r-emerald-500 px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-[72px]">
                  สาขา
                </th>
                {days.map((date) => {
                  const day = new Date(`${date}T00:00:00`);
                  const isToday = date === today;
                  return (
                    <th
                      key={date}
                      className={`w-[92px] border-b border-gray-100 px-2 py-2.5 text-center ${isToday ? "bg-emerald-50 border-b-emerald-200" : "bg-gray-50"}`}
                    >
                      <div
                        className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-emerald-600" : "text-gray-400"}`}
                      >
                        {day.toLocaleDateString("th-TH", { weekday: "short" })}
                      </div>
                      <div
                        className={`text-[15px] font-bold mt-0.5 ${isToday ? "text-emerald-600" : "text-gray-700"}`}
                      >
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
      <td className="w-[72px] bg-white border-b border-gray-100 border-r-2 border-r-emerald-500 px-3 py-2 text-[11px] font-bold text-gray-800 align-middle whitespace-nowrap">
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
            className={`w-[92px] align-top border-b border-l border-gray-100 p-2 transition ${bgClass} ${dragOverCell === cellKey ? "ring-2 ring-emerald-500/60 ring-inset" : ""}`}
            onDragOver={onCellDragOver}
            onDragEnter={() => setDragOverCell(cellKey)}
            onDragLeave={() =>
              setDragOverCell((current) => (current === cellKey ? "" : current))
            }
            onDrop={(event) => onCellDrop(event, branch.id, date)}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${needBadgeClass}`}
              >
                {need} คน
              </span>
              {shift.start ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {shift.start}
                  {shift.end ? ` - ${shift.end}` : ""}
                </span>
              ) : null}
            </div>

            <div className="space-y-1 min-h-[22px]">
              {employeeIds.map((empId) => {
                const employee = data.employees.find(
                  (item) => item.id === empId,
                );
                if (!employee) return null;
                return (
                  <div
                    key={empId}
                    draggable
                    onDragStart={(event) =>
                      onDragStart(event, branch.id, date, empId)
                    }
                    onDragEnd={() => setDragOverCell("")}
                    className="flex items-center gap-1 bg-white border border-gray-100 rounded-full px-2 py-0.5 shadow-sm"
                  >
                    <Avatar employee={employee} size="sm" />
                    <span className="text-[10px] font-semibold text-gray-800 truncate flex-1">
                      {employee.nickname || employee.name}
                    </span>
                    <button
                      onClick={() => onRemove(branch.id, date, empId)}
                      className="text-red-300 hover:text-red-500 text-[11px] leading-none"
                      aria-label="ลบ"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onAssign({ branchId: branch.id, date })}
              className="mt-1.5 w-full text-[10px] py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors"
            >
              + เพิ่ม
            </button>

            <div className="flex justify-end mt-1">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ok ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
              >
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
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-700">แจ้งเตือน</h3>
        <button
          onClick={onViewAllAlerts}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-green-800 hover:bg-gray-200 flex-shrink-0"
        >
          ดูทั้งหมด
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={`${alert.type}_${alert.branch.id}_${alert.date}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${alert.type === "danger" ? "bg-red-50 border-red-100 text-red-700" : "bg-orange-50 border-amber-100 text-amber-700"}`}
          >
            <span className="flex-1">{alert.message}</span>
            <button
              onClick={() =>
                onAssign({ branchId: alert.branch.id, date: alert.date })
              }
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-colors ${alert.type === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
            >
              จัดคน
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationBox({
  data,
  branches,
  days,
  from,
  to,
  user,
  onQuickAdd,
  onAutoFill,
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            ✨ แนะนำจัดตารางตามกติกา
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            กรองจากสาขาที่ลงได้ วันว่าง ไม่ชนตารางเดิม และกระจายจำนวนวันทำงาน
          </p>
        </div>
        <button
          onClick={onAutoFill}
          className="btn btn-primary"
        >
          จัดอัตโนมัติ
        </button>
      </div>
      <div className="space-y-1.5">
        {branches.map((branch) => {
          const recs = days
            .flatMap((date) =>
              recommendedEmployees(data, user, branch.id, date, {
                from,
                to,
              }).map((candidate) => ({ ...candidate, date })),
            )
            .slice(0, 5);
          return (
            <div
              key={branch.id}
              className="flex flex-wrap items-center gap-1 text-xs"
            >
              <span className="font-bold text-gray-700 w-10">
                {branch.code}
              </span>
              <span className="text-gray-400">→</span>
              {recs.length ? (
                recs.map((rec) => (
                  <button
                    key={`${rec.employee.id}_${rec.date}`}
                    onClick={() =>
                      onQuickAdd(branch.id, rec.date, rec.employee.id)
                    }
                    className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors font-semibold text-gray-700"
                  >
                    <Avatar employee={rec.employee} size="sm" />
                    {rec.employee.nickname || rec.employee.name} ·{" "}
                    {thaiShortDate(rec.date)}
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

function AssignModal({ target, data, user, from, to, onClose, onAdd }) {
  if (!target) return null;

  const branch = data.branches.find((item) => item.id === target.branchId);
  const candidates = scheduleCandidates(
    data,
    user,
    target.branchId,
    target.date,
    { from, to },
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-700 to-emerald-600">
          <div>
            <p className="font-bold text-white text-sm">
              จัดคนเข้า {branch?.code || ""}
            </p>
            <p className="text-emerald-200 text-xs mt-0.5">
              {new Date(`${target.date}T00:00:00`).toLocaleDateString("th-TH", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {candidates.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">
              ไม่มีพนักงานที่ว่าง
            </p>
          ) : null}
          {candidates.map((candidate) => (
            <button
              key={candidate.employee.id}
              type="button"
              disabled={candidate.disabled}
              onClick={() =>
                !candidate.disabled &&
                onAdd(target.branchId, target.date, candidate.employee.id)
              }
              className={`flex w-full items-center gap-3 px-5 py-3 transition-colors text-left ${candidate.disabled
                ? "cursor-not-allowed bg-gray-50 text-gray-400"
                : "hover:bg-emerald-50"
                }`}
            >
              <Avatar employee={candidate.employee} size="md" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {candidate.employee.name}
                </p>
                <p className="text-xs text-gray-400">
                  {candidate.disabled
                    ? candidateReason(candidate)
                    : candidate.employee.nickname || candidate.employee.position}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

function candidateReason(candidate) {
  if (candidate.alreadyIn) return "อยู่ในตารางนี้แล้ว";
  if (candidate.busyAt) return `มีตารางที่ ${candidate.busyAt.code || "สาขาอื่น"} แล้ว`;
  if (!candidate.canBranch) return "ไม่ได้ตั้งค่าให้ลงสาขานี้";
  if (!candidate.available) return "วันหยุด/ไม่ว่าง";
  return "ไม่พร้อมลงตาราง";
}

function Avatar({ employee, size = "sm" }) {
  const dimensions =
    size === "sm"
      ? "w-[18px] h-[18px] text-[9px]"
      : size === "md"
        ? "w-[28px] h-[28px] text-xs"
        : "w-9 h-9 text-sm";
  const initial = employee?.nickname?.[0] || employee?.name?.[0] || "?";
  return (
    <div
      className={`${dimensions} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: employee?.color || "#4CAF50" }}
    >
      {initial}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const border =
    {
      green: "border-l-emerald-500",
      red: "border-l-red-400",
      amber: "border-l-amber-500",
      blue: "border-l-blue-500",
    }[accent] || "border-l-emerald-500";

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${border} px-4 py-3 shadow-sm`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-none">{value}</p>
    </div>
  );
}

function buildAlerts(data, branches, from) {
  const alerts = [];
  for (let ahead = 0; ahead <= 30; ahead += 1) {
    const dateObj = new Date(`${from}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + ahead);
    const date = fmtDate(dateObj);
    branches.forEach((branch) => {
      const employeeIds = data.schedule[`${branch.id}_${date}`] || [];
      const need = requiredStaffFor(data, branch.id, date);
      if (employeeIds.length < need) {
        alerts.push({
          type: ahead <= 7 ? "danger" : "warn",
          branch,
          date,
          message: `${ahead <= 7 ? "🚨" : "⚠️"} ${branch.code} วันที่ ${thaiShortDate(date)} ต้องการ ${need} คน มี ${employeeIds.length} คน (อีก ${ahead} วัน)`,
        });
      }
    });
  }
  return [
    ...alerts.filter((alert) => alert.type === "danger").slice(0, 5),
    ...alerts.filter((alert) => alert.type === "warn").slice(0, 3),
  ];
}