import { DAYS, regionColor } from "../hooks/useBranches";
import { thaiTime24 } from "../../../lib/date";

export function BranchCard({ branch, onEdit, onDelete, regionName }) {
  return (
    <div className="section-card-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 body-strong">{branch.code}</span>
          </div>
          <div className="min-w-0">
            <p className="body-strong text-slate-800 body-text truncate leading-snug">
              {branch.name}
            </p>
            <span
              className={`inline-block mt-0.5 caption body-strong px-2 py-0.5 rounded-full ${regionColor[branch.region_id] || regionColor.default}`}
            >
              {regionName}
            </span>
          </div>
        </div>
        <div className="action-cluster opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(branch)}
            className="icon-action"
            title="แก้ไข"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(branch.id)}
            className="icon-action danger"
            title="ลบ"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        <div className="summary-pill">
          <span className="caption text-slate-400 body-emphasis">
            วันธรรมดา
          </span>
          <span className="body-strong text-slate-700">
            {branch.minWeekday}
          </span>
          <span className="caption text-slate-400">คน</span>
        </div>
        <div className="summary-pill">
          <span className="caption text-slate-400 body-emphasis">วันหยุด</span>
          <span className="body-strong text-amber-600">
            {branch.minWeekend}
          </span>
          <span className="caption text-slate-400">คน</span>
        </div>
      </div>

      <div className="border-t border-slate-50 px-5 py-3">
        <p className="caption body-strong text-slate-400 uppercase tracking-wider mb-2">
          เวลาทำการ
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map((day) => (
            <div key={day} className="text-center">
              <p className="caption body-strong text-slate-400 mb-0.5">{day}</p>
              <p className="caption text-slate-600 leading-tight">
                {thaiTime24(branch.hours?.[day])}
              </p>
              <p className="caption text-slate-400 leading-tight">
                {thaiTime24(branch.hoursEnd?.[day])}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}