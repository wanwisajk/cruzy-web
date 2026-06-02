import { numberTH } from '../../../lib/date';

export function EmployeeViewModal({ employee, branches, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">🔎 ดูข้อมูลพนักงาน</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="รหัสพนักงาน" value={employee.id} />
            <Info label="ชื่อเล่น" value={employee.nickname || '-'} />
            <Info label="ชื่อ" value={employee.name} />
            <Info label="ตำแหน่ง" value={employee.position || '-'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="สาขาหลัก" value={branches.find((item) => item.id === employee.branch)?.name || employee.branch || '-'} />
            <Info label="โทรศัพท์" value={employee.phone || '-'} />
            <Info label="ฐานเงินเดือน" value={employee.payType === 'daily' ? `฿${numberTH(employee.salary)} / วัน` : `฿${numberTH(employee.salary)} / เดือน`} />
            <Info label="รหัสสาขา" value={employee.region || '-'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
      <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}
