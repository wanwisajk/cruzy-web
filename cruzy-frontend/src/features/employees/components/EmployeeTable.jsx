import { Avatar } from '../../../components/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { numberTH } from '../../../lib/date';

export function EmployeeTable({ employees, branches, employeeBranches, onView, onEdit }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {['พนักงาน', 'ตำแหน่ง', 'สาขาหลัก', 'สถานะ', 'เงินเดือน / ค่าแรง', 'จัดการ'].map((head) => <th key={head} className="px-4 py-3 font-bold">{head}</th>)}
            </tr>
          </thead>
          <tbody className="text-slate-600 font-medium divide-y divide-slate-100">
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                branch={branches.find((item) => item.id === (employee.branch || (employeeBranches[employee.id] || [])[0]))}
                onView={onView}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeRow({ employee, branch, onView, onEdit }) {
  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Avatar employee={employee} />
          <div>
            <span className="font-bold text-slate-800 block text-sm">{employee.nickname}</span>
            <span className="text-xs text-slate-400 block">ชื่อจริง: {employee.name || '-'} · รหัส: {employee.id}</span>
            <span className="text-xs text-slate-400 sm:hidden">{employee.position || '-'} · {formatSalary(employee)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600 font-medium hidden sm:table-cell">{employee.position}</td>
      <td className="px-4 py-3 hidden sm:table-cell"><Badge tone="blue">{branch?.name || employee.branch || '-'}</Badge></td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Badge tone={employee.empType === 'parttime' ? 'amber' : employee.empType === 'freelance' ? 'sky' : 'emerald'}>
          {employee.empType === 'parttime' ? 'Part-time' : employee.empType === 'freelance' ? 'Freelance' : 'Fulltime'}
        </Badge>
      </td>
      <td className="px-4 py-3 font-bold text-slate-700 hidden sm:table-cell">{formatSalary(employee)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]" onClick={() => onView(employee)}>ดู</button>
          <button type="button" className="px-3 py-2 rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px]" onClick={() => onEdit(employee)}>แก้ไข</button>
        </div>
      </td>
    </tr>
  );
}

function formatSalary(employee) {
  return employee.payType === 'daily'
    ? `฿${numberTH(employee.salary)} / วัน`
    : `฿${numberTH(employee.salary)} / เดือน`;
}
