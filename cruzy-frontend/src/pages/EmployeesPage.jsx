import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { EmployeeFormModal } from '../features/employees/components/EmployeeFormModal';
import { EmployeeViewModal } from '../features/employees/components/EmployeeViewModal';
import { useEmployees } from '../features/employees/hooks/useEmployees';

function nf(n) {
  return (n ?? 0).toLocaleString('th-TH');
}

function thDate(ds) {
  if (!ds) return '—';
  return new Date(`${ds}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
}

function statusLabel(status) {
  return {
    fulltime: 'เต็มเวลา',
    parttime: 'พาร์ตไทม์',
    freelance: 'Freelance',
    active: 'ประจำ',
    trial: 'ทดลองงาน'
  }[status] || status;
}

function statusColor(status) {
  return {
    fulltime: 'bg-emerald-100 text-emerald-800',
    parttime: 'bg-purple-100 text-purple-800',
    freelance: 'bg-blue-100 text-blue-800',
    active: 'bg-emerald-100 text-emerald-800',
    trial: 'bg-amber-100 text-amber-800'
  }[status] || 'bg-gray-100 text-gray-700';
}

function payCycleLabel(c) {
  return {
    weekly: 'รายสัปดาห์',
    bimonthly: 'จ่ายครึ่งเดือน',
    monthly: 'รายเดือน'
  }[c] || c;
}

function StatCard({ label, value, accent = 'green' }) {
  const colorMap = {
    green: 'border-l-emerald-500',
    teal: 'border-l-teal-500',
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500'
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${colorMap[accent] || colorMap.green} px-4 py-3 shadow-sm`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
    </div>
  );
}

export default function EmployeesPage(props) {
  const employees = useEmployees(props);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [activeTab, setActiveTab] = useState('info');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [payCycleFilter, setPayCycleFilter] = useState('all');
  const [contractFilter, setContractFilter] = useState('all');

  const branchOptions = useMemo(() => {
    return props.data.branches?.slice().sort((a, b) => a.code.localeCompare(b.code)) || [];
  }, [props.data.branches]);

  const counts = useMemo(() => {
    const all = (employees.employees || []).length;
    const active = (employees.employees || []).filter(e => e.status === 'active').length;
    const trial = (employees.employees || []).filter(e => e.status === 'trial').length;
    const freelance = (employees.employees || []).filter(e => e.status === 'freelance').length;
    return { all, active, trial, freelance };
  }, [employees.employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedBranch === 'all') return employees.employees;
    return employees.employees.filter((employee) => {
      const assigned = props.data.employeeBranches?.[employee.id] || [];
      return employee.branch === selectedBranch || assigned.includes(selectedBranch);
    });
  }, [selectedBranch, employees.employees, props.data.employeeBranches]);

  const attendanceRows = props.data.attendance || [];
  const attendanceAlerts = props.data.attendanceAlerts || [];
  const warningLetters = props.data.warningLetters || [];
  const filteredWarningLetters = useMemo(() => {
    return warningLetters.filter((letter) => filteredEmployees.some((employee) => employee.id === letter.empId));
  }, [warningLetters, filteredEmployees]);
  const contracts = props.data.contracts || [];

  const payrollRows = useMemo(() => {
    return filteredEmployees
      .filter((employee) => payCycleFilter === 'all' || (employee.payType || 'monthly') === payCycleFilter)
      .map((employee) => {
        const baseWage = employee.payType === 'monthly'
          ? Number(employee.monthlySalary || employee.salary || 0)
          : Number(employee.dailyRate || 0) * 26;
        const comm = employee.commissionEnabled ? Math.round(baseWage * 0.08) : 0;
        const allowance = Number(employee.specialAllowance || 0);
        const lateDeduct = attendanceRows
          .filter((row) => row.empId === employee.id)
          .reduce((sum, row) => sum + (Number(row.lateMin || 0) * 5), 0);
        const sso = employee.payType === 'monthly'
          ? Math.min(Math.round(baseWage * 0.05), 750)
          : 0;
        const net = baseWage + comm + allowance - lateDeduct - sso;
        return { ...employee, baseWage, comm, allowance, lateDeduct, sso, net };
      });
  }, [filteredEmployees, attendanceRows, payCycleFilter]);

  const contractRows = useMemo(() => {
    return contracts.filter((contract) => {
      const matchEmployee = filteredEmployees.some((employee) => employee.id === contract.empId);
      const matchFilter = contractFilter === 'all' || contract.type === contractFilter;
      return matchEmployee && matchFilter;
    });
  }, [contracts, filteredEmployees, contractFilter]);

  const attendanceSummary = useMemo(() => {
    return filteredEmployees.map((employee) => {
      const empAttendance = attendanceRows.filter((row) => row.empId === employee.id);
      const totalLateMins = empAttendance.reduce((sum, row) => sum + (Number(row.lateMin || 0)), 0);
      const breakOverCount = attendanceAlerts.filter((alert) => {
        if (alert.empId !== employee.id) return false;
        const type = String(alert.type || '').toLowerCase();
        return type.includes('break') || type.includes('พัก');
      }).length;
      const warnCount = warningLetters.filter((letter) => letter.empId === employee.id).length;
      return { ...employee, totalLateMins, breakOverCount, warnCount };
    });
  }, [filteredEmployees, attendanceRows, attendanceAlerts, warningLetters]);

  const attendanceFiltered = useMemo(() => {
    if (attendanceFilter === 'late') return attendanceSummary.filter((item) => item.totalLateMins > 0);
    if (attendanceFilter === 'break') return attendanceSummary.filter((item) => item.breakOverCount > 0);
    if (attendanceFilter === 'warn') return attendanceSummary.filter((item) => item.warnCount > 0);
    return attendanceSummary;
  }, [attendanceFilter, attendanceSummary]);

  const attendanceStats = useMemo(() => {
    return {
      totalLate: attendanceSummary.reduce((sum, item) => sum + item.totalLateMins, 0),
      totalBreakOver: attendanceSummary.reduce((sum, item) => sum + item.breakOverCount, 0),
      totalWarnLetters: attendanceSummary.reduce((sum, item) => sum + item.warnCount, 0)
    };
  }, [attendanceSummary]);

  const tabList = [
    { id: 'info', label: 'ข้อมูลพนักงาน' },
    { id: 'payroll', label: 'เงินเดือน' },
    { id: 'contracts', label: 'สัญญาจ้าง' },
    { id: 'attendance_discipline', label: 'เข้างาน/วินัย' }
  ];

  const searchedEmployees = useMemo(() => {
    return filteredEmployees.filter((employee) => {
      const name = `${employee.name || ''}`.toLowerCase();
      const nickname = `${employee.nickname || ''}`.toLowerCase();
      const code = `${employee.code || employee.id || ''}`.toLowerCase();
      const position = `${employee.position || ''}`.toLowerCase();
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || name.includes(query) || nickname.includes(query) || code.includes(query) || position.includes(query);
      const matchesStatus = filterStatus === 'all' || employee.status === filterStatus || employee.empType === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [filteredEmployees, search, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans antialiased text-gray-600">
       




      <div className="bg-white border-b border-gray-100 px-6 shadow-xs">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 max-w-7xl mx-auto">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard label="ทั้งหมด" value={counts.all} accent="green" />
              <StatCard label="พนักงานประจำ" value={counts.active} accent="teal" />
              <StatCard label="ทดลองงาน" value={counts.trial} accent="amber" />
              <StatCard label="Freelance" value={counts.freelance} accent="blue" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex shrink-0 justify-end">
                  <Button variant="primary" size="sm" onClick={employees.openCreate}>+ เพิ่มพนักงาน</Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {['all','active','trial','freelance'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterStatus === s ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
                      {s === 'all' ? 'ทั้งหมด' : statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                      <th className="px-4 py-3">รหัส/พนักงาน</th>
                      <th className="px-4 py-3">ตำแหน่ง</th>
                      <th className="px-4 py-3">สาขาหลัก</th>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">เบอร์โทรศัพท์</th>
                      <th className="px-4 py-3">เริ่มงาน</th>
                      <th className="px-4 py-3">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    {searchedEmployees.map((employee) => {
                      const branch = props.data.branches?.find((item) => item.id === employee.branch);
                      return (
                        <tr key={employee.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: employee.color }} />
                              <div>
                                <div>{employee.name} ({employee.nickname || ''})</div>
                                <div className="text-2xs text-gray-400 font-mono">{employee.code || employee.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{employee.position}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
                              {branch?.code || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold tracking-wide ${statusColor(employee.status || employee.empType)}`}>
                              {statusLabel(employee.status || employee.empType)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">{employee.phone || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{thDate(employee.startDate || employee.start || employee.hiredAt)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedEmp(employee)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition-all"
                            >
                              ดูข้อมูล →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {searchedEmployees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบพนักงาน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-sm font-bold text-gray-700">💰 รายการคำนวณรอบจ่ายปัจจุบัน</span>
              <select
                value={payCycleFilter}
                onChange={(e) => setPayCycleFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white font-semibold"
              >
                <option value="all">รอบจ่ายทั้งหมด</option>
                <option value="weekly">รายสัปดาห์</option>
                <option value="bimonthly">จ่ายครึ่งเดือน</option>
                <option value="monthly">รายเดือน</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold uppercase">
                      <th className="px-3 py-2.5">พนักงาน</th>
                      <th className="px-3 py-2.5">รอบจ่าย</th>
                      <th className="px-3 py-2.5">ค่าจ้างพื้นฐาน</th>
                      <th className="px-3 py-2.5">ค่าคอมฯ</th>
                      <th className="px-3 py-2.5">เบี้ยพิเศษ</th>
                      <th className="px-3 py-2.5">หักสาย/ขาด</th>
                      <th className="px-3 py-2.5">หัก ปกส.</th>
                      <th className="px-3 py-2.5 text-right">สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                    {payrollRows.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/30">
                        <td className="px-3 py-2.5 text-gray-900 font-semibold">{p.name} ({p.nickname || ''})</td>
                        <td className="px-3 py-2.5 text-gray-500">{payCycleLabel(p.payType)}</td>
                        <td className="px-3 py-2.5">฿{nf(p.baseWage)}</td>
                        <td className="px-3 py-2.5 text-emerald-600">+฿{nf(p.comm)}</td>
                        <td className="px-3 py-2.5 text-blue-600">+฿{nf(p.allowance)}</td>
                        <td className="px-3 py-2.5 text-red-500">-฿{nf(p.lateDeduct)}</td>
                        <td className="px-3 py-2.5 text-gray-400">-฿{nf(p.sso)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-700 text-sm">฿{nf(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-100 pb-2">
              {['all', 'ประจำ', 'ทดลองงาน', 'freelance'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContractFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${contractFilter === type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {type === 'all' ? 'ทั้งหมด' : type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contractRows.map((contract) => {
                const employee = filteredEmployees.find((emp) => emp.id === contract.empId);
                return (
                  <div key={contract.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{contract.label || 'สัญญาจ้าง'}</h4>
                      <p className="text-2xs text-gray-400">พนักงาน: {employee?.name || '—'} · ประเภท: {contract.type}</p>
                      <p className="text-xs text-gray-500 mt-1">ระยะเวลา: {thDate(contract.start)} ถึง {thDate(contract.end)}</p>
                    </div>
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold border border-emerald-100">
                      📂 {contract.file ? 'เปิดไฟล์' : 'ไม่มีไฟล์'}
                    </div>
                  </div>
                );
              })}
              {contractRows.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400">ไม่พบสัญญาจ้างในสาขา/ชุดข้อมูลนี้</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance_discipline' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-2xl font-bold">{attendanceStats.totalLate}</div>
                <div className="text-xs text-gray-400 mt-0.5">เวลารวมที่มาสายสะสม</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-2xl font-bold">{attendanceStats.totalBreakOver}</div>
                <div className="text-xs text-gray-400 mt-0.5">จำนวนครั้งที่พักเกินเวลา</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-2xl font-bold">{attendanceStats.totalWarnLetters}</div>
                <div className="text-xs text-gray-400 mt-0.5">ใบเตือน/วินัยพนักงานที่ออกแล้ว</div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAttendanceFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${attendanceFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ทั้งหมด ({attendanceSummary.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter('late')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${attendanceFilter === 'late' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ⚠️ มีประวัติสาย
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter('break')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${attendanceFilter === 'break' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ⏰ พักเกินกำหนด
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter('warn')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${attendanceFilter === 'warn' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                📋 ถูกตักเตือน/มีใบเตือน
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">📊 สรุปสถิติเข้างานและมาตรการวินัยพนักงาน</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                      <th className="p-3">พนักงาน</th>
                      <th className="p-3">ตำแหน่ง</th>
                      <th className="p-3">มาสายรวม</th>
                      <th className="p-3">พักเกินเวลา</th>
                      <th className="p-3">สถานะวินัย / ใบเตือน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                    {attendanceFiltered.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 text-gray-900 font-bold">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                          {item.name} ({item.nickname || ''})
                        </td>
                        <td className="p-3 text-gray-500 text-xs">{item.position}</td>
                        <td className={`p-3 ${item.totalLateMins > 30 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                          {item.totalLateMins > 0 ? `${item.totalLateMins} นาที` : '—'}
                        </td>
                        <td className={`p-3 ${item.breakOverCount > 0 ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                          {item.breakOverCount > 0 ? `${item.breakOverCount} ครั้ง` : '—'}
                        </td>
                        <td className="p-3">
                          {item.warnCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                              📄 ใบเตือน {item.warnCount} ฉบับ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                              ✅ ปกติ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {attendanceFiltered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">
                          ไม่พบข้อมูลประวัติเข้างานผิดกำหนดในกลุ่มตัวกรองนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">📋 เอกสารใบเตือนและมาตรการที่มีผลบังคับใช้</h3>
              {filteredWarningLetters.length === 0 ? (
                <div className="text-center py-8 text-gray-400">ไม่มีบันทึกประวัติการทำผิดวินัยใดๆ</div>
              ) : (
                filteredWarningLetters.map((letter) => {
                  const employee = filteredEmployees.find((emp) => emp.id === letter.empId);
                  return (
                    <div key={letter.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-800">{letter.reason || 'ใบเตือนพนักงาน'}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold tracking-wide bg-red-50 text-red-700 border border-red-100">
                              {letter.status === 'approved' ? 'ได้รับการอนุมัติ' : 'รอดำเนินการ'}
                            </span>
                          </div>
                          <div className="text-2xs text-gray-400 mt-0.5">วันที่ออกบันทึก: {thDate(letter.date)} · พนักงาน: {employee?.name || 'ไม่พบข้อมูล'}</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-50">{letter.reason || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {employees.showModal && employees.modalMode !== 'view' ? (
        <EmployeeFormModal
          mode={employees.modalMode}
          employee={employees.activeEmployee}
          branches={employees.branches}
          onSubmit={employees.handleFormSubmit}
          onClose={employees.closeModal}
        />
      ) : null}

      {employees.showModal && employees.modalMode === 'view' && employees.activeEmployee ? (
        <EmployeeViewModal
          employee={employees.activeEmployee}
          branches={props.data.branches}
          onClose={employees.closeModal}
        />
      ) : null}

      {selectedEmp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{ borderTop: `5px solid ${selectedEmp.color || '#4CAF50'}` }}>
              <div>
                <h2 className="text-base font-bold text-gray-900">{selectedEmp.name} ({selectedEmp.nickname || ''})</h2>
                <p className="text-2xs text-gray-400 font-mono mt-0.5">{selectedEmp.code || selectedEmp.id} · {selectedEmp.position}</p>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="text-gray-400 hover:text-gray-600 text-xl font-semibold">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">เบอร์โทร:</span> <span className="font-semibold">{selectedEmp.phone || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">สาขาหลัก:</span> <span className="font-semibold">{props.data.branches?.find((b) => b.id === selectedEmp.branch)?.name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">สาขาที่วิ่งงานได้:</span> <span className="font-semibold text-emerald-700">{(props.data.employeeBranches?.[selectedEmp.id] || []).map((bid) => props.data.branches?.find((b) => b.id === bid)?.code).filter(Boolean).join(', ') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ประเภทสัญญา:</span> <span className="font-semibold">{statusLabel(selectedEmp.status || selectedEmp.empType)}</span></div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">รูปแบบค่าจ้าง:</span> <span className="font-semibold">{payCycleLabel(selectedEmp.payType)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">ฐานรายได้:</span> <span className="font-bold text-gray-900">฿{nf(selectedEmp.monthlySalary || selectedEmp.salary || selectedEmp.dailyRate)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">เบี้ยเลี้ยงพิเศษ:</span> <span className="font-semibold">฿{nf(selectedEmp.specialAllowance || 0)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
