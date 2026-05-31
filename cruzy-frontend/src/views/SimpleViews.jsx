import { AlertTriangle, Banknote, ClipboardList, FileWarning, Search, Shield, UsersRound } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { numberTH, thaiShortDate } from '../lib/date';
import { getVisibleBranches } from '../lib/schedule';
import { Content, Table } from './ViewLayout';


export function LeaveView({ data, user, currentBranch }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const leaves = data.leaves.filter((leave) => branchIds.includes(data.employees.find((employee) => employee.id === leave.empId)?.branch));
  return (
    <Content title="การลา" icon={ClipboardList} stats={[['คำขอทั้งหมด', leaves.length], ['รออนุมัติ', leaves.filter((l) => l.status === 'pending').length], ['อนุมัติแล้ว', leaves.filter((l) => l.status === 'approved').length]]}>
      <div className="card overflow-hidden">
        <Table headers={['พนักงาน', 'ประเภท', 'วันที่', 'วัน', 'สถานะ', 'เหตุผล']}>
          {leaves.map((leave) => {
            const employee = data.employees.find((item) => item.id === leave.empId);
            return (
              <tr key={leave.id} className="hover:bg-slate-50">
                <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar employee={employee} />{employee?.name || '-'}</div></td>
                <td className="px-3 py-2">{leave.type}</td>
                <td className="px-3 py-2">{thaiShortDate(leave.from)}{leave.from !== leave.to ? ` - ${thaiShortDate(leave.to)}` : ''}</td>
                <td className="px-3 py-2">{leave.days}</td>
                <td className="px-3 py-2"><Badge tone={leave.status === 'approved' ? 'green' : leave.status === 'rejected' ? 'red' : 'orange'}>{leave.status}</Badge></td>
                <td className="px-3 py-2">{leave.reason || '-'}</td>
              </tr>
            );
          })}
        </Table>
      </div>
    </Content>
  );
}

export function SalesView({ data, user, currentBranch, from, to }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const rows = data.sales.filter((sale) => branchIds.includes(sale.bid) && sale.date >= from && sale.date <= to);
  const total = rows.reduce((sum, sale) => sum + sale.total, 0);
  return (
    <Content title="ยอดขาย" icon={Banknote} stats={[['ยอดรวม', numberTH(total)], ['รายการ', rows.length], ['ออเดอร์', rows.reduce((sum, sale) => sum + sale.orders, 0)]]}>
      <div className="grid gap-3 lg:grid-cols-3">
        {rows.map((sale) => {
          const branch = data.branches.find((item) => item.id === sale.bid);
          return (
            <div key={sale.id} className="card border-l-4 border-cruzy p-4">
              <div className="mb-2 flex items-center justify-between text-sm font-bold"><span>{branch?.code}</span><span>{numberTH(sale.total)}</span></div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>เงินสด {numberTH(sale.cash)}</span><span>โอน {numberTH(sale.transfer)}</span><span>บัตร {numberTH(sale.credit)}</span><span>QR {numberTH(sale.qr)}</span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">{thaiShortDate(sale.date)} · {sale.orders} orders</div>
            </div>
          );
        })}
      </div>
    </Content>
  );
}

export function CommissionView({ data, user, currentBranch }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const employees = data.employees.filter((employee) => branchIds.includes(employee.branch));
  return (
    <Content title="ค่าคอม" icon={UsersRound} stats={[['พนักงาน', employees.length], ['เปิดรับคอม', employees.filter((e) => e.commissionEnabled).length], ['สาขา', branchIds.length]]}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((employee) => (
          <div key={employee.id} className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-3"><Avatar employee={employee} /><div><div className="text-sm font-bold">{employee.name}</div><div className="text-xs text-slate-500">{employee.position}</div></div></div>
            <Badge tone={employee.commissionEnabled ? 'green' : 'gray'}>{employee.commissionEnabled ? 'คิดคอม' : 'ปิด'}</Badge>
          </div>
        ))}
      </div>
    </Content>
  );
}

export function InspectionView({ data, user, currentBranch }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const rows = data.inspections.filter((row) => branchIds.includes(row.bid));
  return (
    <Content title="ตรวจร้าน" icon={Search} stats={[['รายการ', rows.length], ['ผ่าน', rows.filter((r) => r.status === 'pass').length], ['มีปัญหา', rows.filter((r) => r.status !== 'pass').length]]}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const branch = data.branches.find((item) => item.id === row.bid);
          return <div key={row.id} className={`card border-l-4 p-4 ${row.status === 'pass' ? 'border-cruzy' : 'border-danger'}`}><div className="flex justify-between text-sm font-bold"><span>{branch?.code}</span><Badge tone={row.status === 'pass' ? 'green' : 'red'}>{row.status}</Badge></div><div className="mt-2 text-xs text-slate-500">{thaiShortDate(row.date)} · ส่งโดย {row.submittedBy || '-'}</div></div>;
        })}
      </div>
    </Content>
  );
}

export function AlertsView({ data, user, currentBranch }) {
  const branchIds = getVisibleBranches(data, user, currentBranch).map((branch) => branch.id);
  const rows = data.attendanceAlerts.filter((alert) => branchIds.includes(alert.branch));
  return (
    <Content title="แจ้งเตือน" icon={AlertTriangle} stats={[['ทั้งหมด', rows.length], ['ยังไม่รับทราบ', rows.filter((a) => !a.ack).length], ['รับทราบแล้ว', rows.filter((a) => a.ack).length]]}>
      <div className="card overflow-hidden">
        {rows.map((alert) => {
          const employee = data.employees.find((item) => item.id === alert.empId);
          const branch = data.branches.find((item) => item.id === alert.branch);
          return <div key={alert.id} className="flex items-start gap-3 border-b border-slate-100 p-4 last:border-0"><div className="rounded-full bg-red-50 p-2 text-danger"><AlertTriangle size={18} /></div><div className="flex-1"><div className="text-sm font-bold">{alert.title}</div><div className="text-xs text-slate-500">{employee?.name || '-'} · {branch?.code || '-'} · {thaiShortDate(alert.date)}</div><div className="mt-1 text-xs text-slate-600">{alert.detail}</div></div><Badge tone={alert.ack ? 'green' : 'orange'}>{alert.ack ? 'ack' : 'new'}</Badge></div>;
        })}
      </div>
    </Content>
  );
}

export function WarningView({ data }) {
  return (
    <Content title="หนังสือเตือน" icon={FileWarning} stats={[['เอกสาร', data.warningLetters.length], ['Template', data.warningLetterTemplates.length], ['Draft', data.warningLetters.filter((w) => w.status === 'draft').length]]}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.warningLetters.map((letter) => {
          const employee = data.employees.find((item) => item.id === letter.empId);
          return <div key={letter.id} className="card border-l-4 border-warn p-4"><div className="flex justify-between text-sm font-bold"><span>{employee?.name || '-'}</span><Badge tone="orange">{letter.level}</Badge></div><p className="mt-2 text-xs text-slate-500">{letter.reason || 'ไม่มีรายละเอียด'}</p><div className="mt-3 text-[11px] text-slate-400">{thaiShortDate(letter.date)}</div></div>;
        })}
      </div>
    </Content>
  );
}

export function AuditLogView({ data }) {
  return (
    <Content title="Log" icon={ClipboardList} stats={[['รายการ', data.auditLogs.length], ['Sales', data.auditLogs.filter((l) => l.tableName === 'sales').length], ['Inspection', data.auditLogs.filter((l) => l.tableName === 'inspection').length]]}>
      <div className="card overflow-hidden">
        {data.auditLogs.slice(0, 80).map((log) => {
          const branch = data.branches.find((item) => item.id === log.branchId);
          return <div key={log.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-0"><Badge tone="blue">{log.action}</Badge><span className="font-semibold">{log.tableName}</span><span className="text-slate-500">{branch?.code || '-'}</span><span className="ml-auto text-slate-400">{log.timestamp}</span></div>;
        })}
      </div>
    </Content>
  );
}

export function AccessView({ data, user }) {
  if (user.role !== 'owner') {
    return <Content title="ไม่มีสิทธิ์" icon={Shield} stats={[]}><div className="card p-10 text-center text-danger">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</div></Content>;
  }
  return (
    <Content title="สิทธิ์" icon={Shield} stats={[['ผู้ใช้งาน', data.users.length], ['กลุ่ม Line', data.lineGroups.length], ['สาขา', data.branches.length]]}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <Table headers={['Username', 'ชื่อ', 'สิทธิ์', 'ขอบเขต']}>
            {data.users.map((item) => <tr key={item.username}><td className="px-3 py-2 font-bold">{item.username}</td><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.role}</td><td className="px-3 py-2">{item.scope}</td></tr>)}
          </Table>
        </div>
        <div className="grid gap-3">
          {data.lineGroups.map((group) => <div key={group.name} className="card p-4"><div className="text-sm font-bold text-cruzy">{group.name}</div><div className="mt-2 text-xs text-slate-500">{group.branches.length} สาขา · {group.members.length} สมาชิก</div></div>)}
        </div>
      </div>
    </Content>
  );
}


