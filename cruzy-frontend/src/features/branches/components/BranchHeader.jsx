export function BranchHeader({ onAdd }) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">⚙️ ตั้งค่าสาขา</h1>
        <p className="text-xs text-slate-400 mt-0.5">Branch Management — กำหนดคน เวลา และเงื่อนไขแต่ละสาขา</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        เพิ่มสาขาใหม่
      </button>
    </div>
  );
}
