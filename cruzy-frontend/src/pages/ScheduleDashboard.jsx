import { useMemo, useState } from "react";
import { dateRange, fmtDate, thaiShortDate } from "../lib/date";
import {
  getVisibleBranches,
  recommendedEmployees,
  requiredStaffFor,
  shiftFor,
} from "../lib/schedule";
import { useSchedule } from "../features/schedules/hooks/useSchedule";
import BranchSettingsSection from "../features/schedules/components/BranchSettingsSection";
import OverviewSection from "../features/schedules/components/OverviewSection";
import AllAlertsPage from "../features/schedules/components/AllAlertsPage";
import { ScheduleAssignModal } from "../features/schedules/components/ScheduleAssignModal";
import { SchedulePageTabs } from "../features/schedules/components/SchedulePageTabs";
import { SchedulePlanner } from "../features/schedules/components/SchedulePlanner";
import { buildScheduleAlerts } from "../features/schedules/lib/scheduleDashboardUtils";

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
    () => buildScheduleAlerts(scheduleData, branches, from),
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
      <SchedulePageTabs activeView={view} tabs={tabs} onChange={setView} />

      {error ? <div className="mx-5 mt-5 alert-bar warn">{error}</div> : null}
      {view === "planner" ? (
        <SchedulePlanner
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

      <ScheduleAssignModal
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
