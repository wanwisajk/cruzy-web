import { ClipboardList, Plus } from "lucide-react";

export function LeaveDashboardHeader({ onCreate }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-xl font-semibold">
      <div className="flex items-center gap-3">
        <ClipboardList size={16} className="text-slate-400" />
        <h2>ระบบลาของพนักงาน</h2>
      </div>
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        <Plus size={16} /> ขอวันลา
      </button>
    </div>
  );
}
