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
  
  const [showForm, setShowForm] = useState(false);

  function handleFormSubmit(savedPayload) {
    const id = savedPayload.id;
    
    // แปลงโครงสร้างที่คืนมาจาก API หลังบ้านให้เข้ากับระบบ Client State หน้าบ้าน (ล้อตาม hydrate.js)
    const newEmployee = {
      id: id,
      name: savedPayload.name,
      nickname: savedPayload.nickname,
      color: savedPayload.color,
      position: savedPayload.position,
      line_user_id: savedPayload.line_user_id,
      branch: savedPayload.branchEligibility?.[0]?.branchId || 'b1',
      salary: savedPayload.payProfile?.salary || 0,
      payType: savedPayload.payProfile?.payType || 'monthly',
      payCycle: savedPayload.payProfile?.payCycle || 'monthly',
      breakHours: savedPayload.payProfile?.breakHours || 1,
      commissionEnabled: savedPayload.payProfile?.commissionEnabled || false,
      startDate: savedPayload.payProfile?.effectiveFrom || new Date().toISOString().split('T')[0],
      region: savedPayload.regionId || '',
      phone: savedPayload.phone || ''
    };
    
    setData((current) => ({
      ...current,
      employees: [...current.employees, newEmployee],
      employeeBranches: {
        ...current.employeeBranches,
        [id]: savedPayload.branchEligibility.map((b) => b.branchId),
      },
      employeePayProfiles: [...(current.employeePayProfiles || []), {
        id: `profile_${Date.now()}`,
        employee_id: id,
        pay_type: savedPayload.payProfile?.payType,
        monthly_salary: savedPayload.payProfile?.monthlySalary || 0,
        daily_rate: savedPayload.payProfile?.dailyRate || 0,
        commission_enabled: savedPayload.payProfile?.commissionEnabled,
        effective_from: savedPayload.payProfile?.effectiveFrom,
        is_active: true
      }]
    }));
    
    setShowForm(false);
    if (toast) toast(`✅ บันทึกข้อมูลพนักงาน ${newEmployee.name} สำเร็จเรียบร้อย!`);
  }

  return (
    <Content 
      title="พนักงาน" 
      icon={UserRound} 
      stats={[
        ['ทั้งหมดในระบบ', data.employees.length],
        ['พนักงานในสาขาที่เลือก', employees.length],
        ['สาขาที่แสดงผล', branchIds.length]
      ]}
    >
      <div className="mb-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ เพิ่มพนักงาน</Button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table headers={['พนักงาน', 'ตำแหน่ง', 'สาขาหลัก', 'สถานะ', 'เงินเดือน / ค่าแรง']}>
          {employees.map((employee) => {
            const primaryBranchId = employee.branch || (data.employeeBranches[employee.id] || [])[0];
            const branch = data.branches.find((item) => item.id === primaryBranchId);
            return (
              <tr key={employee.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar employee={employee} /> 
                    <div>
                      <span className="font-bold text-slate-800 block text-sm">{employee.name}</span>
                      <span className="text-xs text-slate-400">ชื่อเล่น: {employee.nickname || '-'} · รหัส: {employee.id}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium">{employee.position}</td>
                <td className="px-4 py-3"><Badge tone="blue">{branch?.code || employee.branch || '-'}</Badge></td>
                <td className="px-4 py-3">
                  <Badge tone="gray">—</Badge>
                </td>
                <td className="px-4 py-3 font-bold text-slate-700">
                  {employee.payType === 'daily' ? `฿${numberTH(employee.salary)} / วัน` : `฿${numberTH(employee.salary)} / เดือน`}
                </td>
              </tr>
            );
          })}
        </Table>
      </div>

      {/* 🔐 SCREEN LAYER MODAL WINDOW (ฟอร์มเพิ่มพนักงาน) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">➕ ลงทะเบียนและสร้างโปรไฟล์รายได้พนักงานใหม่</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <AddEmployeeForm
                branches={branches} 
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Content>
  );
}

// ==============================================================================
// 📦 REUSABLE SUB UI LAYOUT (ย้ายฟังก์ชันสไตล์ยุ่งเหยิงจาก HTML มาเป็น Tailwind คอมโพเนนต์)
// ==============================================================================
function Content({ title, icon: Icon, stats, children }) {
  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg"><Icon size={20} /></div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>
      {stats?.length ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-white border border-slate-200/60 shadow-sm p-4 rounded-xl flex flex-col justify-between min-h-85px border-t-4 border-t-emerald-700">
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