import { Settings, Plus } from "lucide-react";

export function BranchHeader({ onAdd }) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <h1 className="heading-2 text-slate-800"> ตั้งค่าสาขา</h1>
        </div>
        <p className="caption text-slate-400 mt-0.5">
          Branch Management — กำหนดคน เวลา และเงื่อนไขแต่ละสาขา
        </p>
      </div>
      <button type="button" onClick={onAdd} className="btn btn-primary">
        <Plus size={14} />
        เพิ่มสาขาใหม่
      </button>
    </div>
  );
}