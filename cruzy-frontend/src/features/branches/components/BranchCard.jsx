import { DAYS, regionColor } from '../hooks/useBranches';

export function BranchCard({ branch, onEdit, onDelete, regionName }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-bold text-sm">{branch.code}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate leading-snug">{branch.name}</p>
            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${regionColor[branch.region_id] || regionColor.default}`}>
              {regionName}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(branch)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="แก้ไข">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={() => onDelete(branch.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="ลบ">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400 font-medium">วันธรรมดา</span>
          <span className="text-sm font-bold text-slate-700">{branch.minWeekday}</span>
          <span className="text-[10px] text-slate-400">คน</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400 font-medium">วันหยุด</span>
          <span className="text-sm font-bold text-amber-600">{branch.minWeekend}</span>
          <span className="text-[10px] text-slate-400">คน</span>
        </div>
      </div>

      <div className="border-t border-slate-50 px-5 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">เวลาทำการ</p>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map((day) => (
            <div key={day} className="text-center">
              <p className="text-[9px] font-bold text-slate-400 mb-0.5">{day}</p>
              <p className="text-[9px] text-slate-600 leading-tight">{(branch.hours?.[day] || '').slice(0, 5)}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{(branch.hoursEnd?.[day] || '').slice(0, 5)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
