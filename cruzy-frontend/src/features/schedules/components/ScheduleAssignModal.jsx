import { X } from "lucide-react";
import { scheduleCandidates } from "../../../lib/schedule";
import { scheduleCandidateReason } from "../lib/scheduleDashboardUtils";
import { ScheduleAvatar } from "./ScheduleAvatar";

export function ScheduleAssignModal({ target, data, user, from, to, onClose, onAdd }) {
  if (!target) return null;

  const branch = data.branches.find((item) => item.id === target.branchId);
  const candidates = scheduleCandidates(data, user, target.branchId, target.date, {
    from,
    to,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-white">จัดคนเข้า {branch?.code || ""}</p>
            <p className="mt-0.5 text-xs text-emerald-200">
              {new Date(`${target.date}T00:00:00`).toLocaleDateString("th-TH", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-64 divide-y divide-gray-50 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">ไม่มีพนักงานที่ว่าง</p>
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
              className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                candidate.disabled ? "cursor-not-allowed bg-gray-50 text-gray-400" : "hover:bg-emerald-50"
              }`}
            >
              <ScheduleAvatar employee={candidate.employee} size="md" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{candidate.employee.name}</p>
                <p className="text-xs text-gray-400">
                  {candidate.disabled
                    ? scheduleCandidateReason(candidate)
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
