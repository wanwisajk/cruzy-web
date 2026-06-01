import { useState } from 'react';
import { 
  AlertTriangle, Banknote, ClipboardList, FileWarning, 
  Search, Shield, UserRound, UsersRound 
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import AddEmployeeForm from '../components/AddEmployeeForm';
import { numberTH, thaiShortDate } from '../lib/date';
import { getVisibleBranches } from '../lib/schedule';

export function EmployeeView({ data, user, currentBranch, setData, toast }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const branches = getVisibleBranches(data, user, currentBranch);
  
  // กรองพนักงานจากสาขาหลัก หรือสาขาที่พนักงานสามารถไปช่วยงานได้ ( employeeBranchEligibility )
  const employees = data.employees.filter((employee) => 
    branchIds.includes(employee.branch) || 
    (data.employeeBranches[employee.id] || []).some((id) => branchIds.includes(id))
  );
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [activeEmployee, setActiveEmployee] = useState(null);

  const employmentTypeCounts = data.employees.reduce((acc, employee) => {
    const type = employee.empType || 'fulltime';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, { fulltime: 0, parttime: 0, freelance: 0 });

  const totalEmployees = data.employees.length;

  function handleFormSubmit(savedPayload) {
    const id = savedPayload.id;
    const branchIds = savedPayload.branchEligibility?.map((b) => b.branchId || b.branch_id) || (activeEmployee?.branch ? [activeEmployee.branch] : []);
    const updatedEmployee = {
      id,
      name: savedPayload.name,
      nickname: savedPayload.nickname,
      color: savedPayload.color,
      position: savedPayload.position,
      line_user_id: savedPayload.line_user_id,
      empType: savedPayload.empType || activeEmployee?.empType || 'fulltime',
      branch: savedPayload.branchEligibility?.[0]?.branchId || activeEmployee?.branch || 'b1',
      salary: savedPayload.payProfile?.salary || 0,
      payType: savedPayload.payProfile?.payType || 'monthly',
      payCycle: savedPayload.payProfile?.payCycle || 'monthly',
      breakHours: savedPayload.payProfile?.breakHours || 1,
      commissionEnabled: savedPayload.payProfile?.commissionEnabled || false,
      startDate: savedPayload.payProfile?.effectiveFrom || activeEmployee?.startDate || new Date().toISOString().split('T')[0],
      region: savedPayload.regionId || activeEmployee?.region || '',
      phone: savedPayload.phone || ''
    };

    setData((current) => {
      const existingIndex = current.employees.findIndex((emp) => emp.id === id);
      const employees = existingIndex >= 0
        ? current.employees.map((emp) => emp.id === id ? { ...emp, ...updatedEmployee } : emp)
        : [...current.employees, updatedEmployee];

      return {
        ...current,
        employees,
        employeeBranches: {
          ...current.employeeBranches,
          [id]: branchIds
        },
        employeePayProfiles: existingIndex >= 0 ? current.employeePayProfiles : [...(current.employeePayProfiles || []), {
          id: `profile_${Date.now()}`,
          employee_id: id,
          pay_type: savedPayload.payProfile?.payType,
          monthly_salary: savedPayload.payProfile?.monthlySalary || 0,
          daily_rate: savedPayload.payProfile?.dailyRate || 0,
          commission_enabled: savedPayload.payProfile?.commissionEnabled,
          effective_from: savedPayload.payProfile?.effectiveFrom,
          is_active: true
        }]
      };
    });

    setShowModal(false);
    setActiveEmployee(null);
    setModalMode('create');

    if (toast) toast(`✅ บันทึกข้อมูลพนักงาน ${updatedEmployee.name} สำเร็จเรียบร้อย!`);
  }

  return (
    <Content 
      title="พนักงาน" 
      icon={UserRound} 
      stats={[
        ['รวมทั้งหมด', totalEmployees, 'slate'],
        ['เต็มเวลา', employmentTypeCounts.fulltime, 'emerald'],
        ['พาร์ตไทม์', employmentTypeCounts.parttime, 'amber'],
        ['Freelance', employmentTypeCounts.freelance, 'sky']
      ]}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="primary" size="sm" onClick={() => { setModalMode('create'); setActiveEmployee(null); setShowModal(true); }}>+ เพิ่มพนักงาน</Button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table headers={['พนักงาน', 'ตำแหน่ง', 'สาขาหลัก', 'สถานะ', 'เงินเดือน / ค่าแรง', 'จัดการ']}>
          {employees.map((employee) => {
            const primaryBranchId = employee.branch || (data.employeeBranches[employee.id] || [])[0];
            const branch = data.branches.find((item) => item.id === primaryBranchId);
            return (
              <tr key={employee.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <Avatar employee={employee} /> 
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{employee.nickname}</span>
                      <span className="text-xs text-slate-400 block">ชื่อจริง: {employee.name || '-'} · รหัส: {employee.id}</span>
                      <span className="text-xs text-slate-400 sm:hidden">{employee.position || '-'} · {employee.payType === 'daily' ? `฿${numberTH(employee.salary)} / วัน` : `฿${numberTH(employee.salary)} / เดือน`}</span>
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
                <td className="px-4 py-3 font-bold text-slate-700 hidden sm:table-cell">
                  {employee.payType === 'daily' ? `฿${numberTH(employee.salary)} / วัน` : `฿${numberTH(employee.salary)} / เดือน`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px]"
                      onClick={() => { setModalMode('view'); setActiveEmployee(employee); setShowModal(true); }}
                    >ดู</button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px]"
                      onClick={() => { setModalMode('edit'); setActiveEmployee(employee); setShowModal(true); }}
                    >แก้ไข</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      {showModal && modalMode === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">➕ ลงทะเบียนและสร้างโปรไฟล์รายได้พนักงานใหม่</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <AddEmployeeForm
                branches={branches} 
                onSubmit={handleFormSubmit}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showModal && modalMode === 'edit' && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">✏️ แก้ไขข้อมูลพนักงาน</h3>
              <button onClick={() => { setShowModal(false); setActiveEmployee(null); }} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <AddEmployeeForm
                branches={branches}
                onSubmit={handleFormSubmit}
                onCancel={() => { setShowModal(false); setActiveEmployee(null); }}
                employee={activeEmployee}
                mode="edit"
              />
            </div>
          </div>
        </div>
      )}

      {showModal && modalMode === 'view' && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">🔎 ดูข้อมูลพนักงาน</h3>
              <button onClick={() => { setShowModal(false); setActiveEmployee(null); }} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">รหัสพนักงาน</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.id}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">ชื่อเล่น</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.nickname || '-'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">ชื่อ</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.name}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">ตำแหน่ง</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.position || '-'}</div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">สาขาหลัก</div>
                  <div className="font-semibold text-slate-800">{data.branches.find((item) => item.id === activeEmployee.branch)?.name || activeEmployee.branch || '-'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">โทรศัพท์</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.phone || '-'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">ฐานเงินเดือน</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.payType === 'daily' ? `฿${numberTH(activeEmployee.salary)} / วัน` : `฿${numberTH(activeEmployee.salary)} / เดือน`}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">รหัสสาขา</div>
                  <div className="font-semibold text-slate-800">{activeEmployee.region || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Content>
  );
}

function Content({ title, icon: Icon, stats, children }) {
  const toneClasses = {
    emerald: 'border-t-emerald-700 bg-emerald-50/60',
    amber: 'border-t-amber-700 bg-amber-50/60',
    sky: 'border-t-sky-700 bg-sky-50/60',
    slate: 'border-t-slate-700 bg-slate-50/60'
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg"><Icon size={20} /></div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>
      {stats?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(([label, value, tone = 'slate']) => (
            <div key={label} className={`bg-white border border-slate-200/60 shadow-sm p-4 rounded-xl flex flex-col justify-between min-h-85px ${toneClasses[tone]}`}>
              <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="pt-2">{children}</div>
    </div>
  );
}

function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            {headers.map((head) => <th key={head} className="px-4 py-3 font-bold">{head}</th>)}
          </tr>
        </thead>
        <tbody className="text-slate-600 font-medium divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}