import { fmtDate, thaiShortDate } from "../../../lib/date";
import { requiredStaffFor } from "../../../lib/schedule";

export function buildScheduleAlerts(data, branches, from) {
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

  return alerts.sort((left, right) => {
    if (left.type !== right.type) return left.type === "danger" ? -1 : 1;
    return String(left.date).localeCompare(String(right.date)) ||
      String(left.branch?.code || "").localeCompare(String(right.branch?.code || ""));
  });
}

export function scheduleCandidateReason(candidate) {
  if (candidate.alreadyIn) return "อยู่ในตารางนี้แล้ว";
  if (candidate.busyAt) return `มีตารางที่ ${candidate.busyAt.code || "สาขาอื่น"} แล้ว`;
  if (!candidate.canBranch) return "ไม่ได้ตั้งค่าให้ลงสาขานี้";
  if (!candidate.available) return "วันหยุด/ไม่ว่าง";
  return "ไม่พร้อมลงตาราง";
}
