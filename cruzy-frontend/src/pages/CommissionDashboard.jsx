import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useCommission } from '../features/commission/hooks/useCommission.js';
import { dateRange } from '../lib/date';
import { employeeCommissionForPeriod } from '../features/employees/lib/employeePageUtils.js';

function money(v) {
  return Number(v || 0).toLocaleString('th-TH');
}

export default function CommissionDashboard({ data: initialData, user, currentBranch, from, to }) {
  const { push } = useToast();
  const { data, loading, refreshCommissionData } = useCommission(initialData, push);
  const [search, setSearch] = useState('');
  const [computed, setComputed] = useState([]);
  const branchFilter = currentBranch ?? 'all';

  const branches = useMemo(() => (data?.branches || []).map((b) => ({ id: b.id, code: b.code, name: b.name })), [data]);
  const employees = useMemo(() => data?.employees || [], [data]);
  const periodDays = useMemo(() => {
    const start = from || data?.initialDate;
    const end = to || data?.initialDateTo || start;
    return start && end ? dateRange(start, end) : [];
  }, [from, to, data]);

  function computeAll() {
    const rows = employees.map((emp) => {
      const commissionEnabled = emp.commissionEnabled !== false;
      const commissionInfo = employeeCommissionForPeriod(data, emp, periodDays, branchFilter);
      const branchObj = branches.find((b) => String(b.id) === String(emp.branch)) || {};
      return {
        empId: emp.id,
        name: emp.name,
        code: emp.code || emp.id,
        branchId: emp.branch,
        branchCode: branchObj.code || '',
        branchName: branchObj.name || '',
        responsibleBranches: commissionInfo.responsibleBranches,
        eligibleDays: commissionInfo.commissionDays,
        sales: commissionInfo.commissionSales,
        tier: commissionEnabled ? commissionInfo.commissionTypeLabel : 'ไม่คิดค่าคอม',
        rate: commissionInfo.rate,
        commission: commissionInfo.commission,
        dailyBreakdown: commissionInfo.dailyBreakdown,
        status: commissionInfo.commissionSales > 0 ? 'calculated' : 'none'
      };
    });

    setComputed(rows);
    push && push('คำนวณค่าคอมมิชชันเรียบร้อย');
  }

  useEffect(() => {
    computeAll();
  }, [data, branchFilter, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return computed;
    return computed.filter((r) => (r.name || '').toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q) || (r.branchCode || '').toLowerCase().includes(q) || (r.branchName || '').toLowerCase().includes(q));
  }, [computed, search]);

  const summary = useMemo(() => {
    const totalSales = filtered.reduce((s, r) => s + Number(r.sales || 0), 0);
    const totalCommission = filtered.reduce((s, r) => s + Number(r.commission || 0), 0);
    const earners = filtered.filter((r) => Number(r.commission || 0) > 0).length;
    const totalDays = filtered.reduce((s, r) => s + Number(r.eligibleDays || 0), 0);
    return { totalSales, totalCommission, earners, totalDays };
  }, [filtered]);

  function exportCsv() {
    const header = ['พนักงาน', 'รหัส', 'สาขา', 'ยอดขาย', 'ประเภทคอม', 'วัน', '%', 'ค่าคอมมิชชัน'];
    const lines = [header.join(',')];
    filtered.forEach((r) => {
      lines.push([`"${r.name}"`, r.code, `"${r.branchCode || r.branchName}"`, r.sales, `"${r.tier}"`, r.eligibleDays, r.rate, r.commission].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
          <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
            <div className="flex gap-4 px-1 sm:grid sm:px-0 sm:grid-cols-2 xl:grid-cols-4">
              <div className="h-24 min-w-[170px] shrink-0 rounded-lg bg-slate-200 sm:min-w-0" />
              <div className="h-24 min-w-[170px] shrink-0 rounded-lg bg-slate-200 sm:min-w-0" />
              <div className="h-24 min-w-[170px] shrink-0 rounded-lg bg-slate-200 sm:min-w-0" />
              <div className="h-24 min-w-[170px] shrink-0 rounded-lg bg-slate-200 sm:min-w-0" />
            </div>
          </div>
          <div className="h-8 bg-slate-200 rounded-lg w-full" />
          <div className="h-48 bg-slate-200 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-page page-body">
      <div className="page-header">
        <div className="page-heading-text">
          <h2 className="page-title">💰 ระบบคำนวณค่าคอมมิชชันพนักงาน</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button onClick={computeAll} className="btn btn-secondary btn-lg"><RefreshCw size={16} /> คำนวณค่าคอมมิชชัน</button>
          <button onClick={exportCsv} className="btn btn-secondary btn-lg"><Download size={16} /> Export Excel</button>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
        <div className="flex gap-3 px-1 sm:grid sm:px-0 sm:grid-cols-2 xl:grid-cols-4">
        <div className="section-card-sm min-w-[170px] shrink-0 sm:min-w-0">
          <div className="body-text text-slate-500">ยอดขายรวม</div>
          <div className="stat-number">฿{money(summary.totalSales)}</div>
        </div>
        <div className="section-card-sm min-w-[170px] shrink-0 sm:min-w-0">
          <div className="body-text text-slate-500">ค่าคอมรวม</div>
          <div className="stat-number">฿{money(summary.totalCommission)}</div>
        </div>
        <div className="section-card-sm min-w-[170px] shrink-0 sm:min-w-0">
          <div className="body-text text-slate-500">พนักงานที่ได้คอม</div>
          <div className="stat-number">{summary.earners}</div>
        </div>
        <div className="section-card-sm min-w-[170px] shrink-0 sm:min-w-0">
          <div className="body-text text-slate-500">จำนวนวันที่คิดคอม</div>
          <div className="stat-number">{summary.totalDays}</div>
        </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา ชื่อ / รหัส / สาขา" className="input w-full sm:w-80" />
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse body-text">
          <thead>
            <tr className="bg-[#fafafa]">
              <th className="p-3 text-left">พนักงาน</th>
              <th className="p-3 text-left">สาขา</th>
              <th className="p-3 text-right">ยอดขาย</th>
              <th className="p-3 text-left">ประเภทคอม</th>
              <th className="p-3 text-right">วัน</th>
              <th className="p-3 text-right">%</th>
              <th className="p-3 text-right">ค่าคอมมิชชัน</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="empty-row">ยังไม่มีข้อมูลค่าคอมมิชชัน</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.empId} className="hover:bg-slate-50">
                  <td className="p-3 body-strong">{r.name} <div className="caption text-slate-500">{r.code}</div></td>
                  <td className="p-3">{r.branchCode || r.branchName}</td>
                  <td className="p-3 text-right">฿{money(r.sales)}</td>
                  <td className="p-3">{r.tier}</td>
                  <td className="p-3 text-right">{r.eligibleDays}</td>
                  <td className="p-3 text-right">{(r.rate*100).toFixed(1)}%</td>
                  <td className="p-3 text-right">฿{money(r.commission)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
