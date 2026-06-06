import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useCommission } from '../features/commission/hooks/useCommission.js';
import { dateRange } from '../lib/date';

const COMMISSION_TYPE_LABELS = {
  scheduled_assigned_branch_days: 'เลือกสาขาเอง',
  actual_work_days_all_branches: 'ทุกสาขาตามตารางงาน',
  period_days_responsible_branches: 'ทุกวันของสาขาที่ดูแล'
};

function money(v) {
  return Number(v || 0).toLocaleString('th-TH');
}

function getResponsibleBranches(data, emp, fallbackBranch) {
  const empId = emp.id;
  const rules = (data?.employeeBranchRules || []).filter((rule) => rule.empId === empId && rule.canWork !== false);
  if (emp.commissionCalcType === 'actual_work_days_all_branches') {
    const workRuleBranches = rules.map((rule) => rule.branchId);
    if (workRuleBranches.length) return [...new Set(workRuleBranches.filter(Boolean))];
  }

  const ruleBranches = rules
    .filter((rule) => rule.commissionEligible !== false)
    .map((rule) => rule.branchId);
  if (rules.length) return [...new Set(ruleBranches.filter(Boolean))];

  const mappedBranches = data?.employeeBranches?.[empId] || [];
  return [...new Set([...ruleBranches, ...mappedBranches, fallbackBranch].filter(Boolean))];
}

function hasScheduledShift(data, empId, branchId, date) {
  return (data?.schedule?.[`${branchId}_${date}`] || []).includes(empId);
}

function saleMatchesCommissionType(data, emp, sale, responsibleBranches, periodDays) {
  const branchId = sale.bid;
  const date = sale.date;
  if (!responsibleBranches.map(String).includes(String(branchId))) return false;

  if (emp.commissionCalcType === 'period_days_responsible_branches') {
    return periodDays.includes(date);
  }

  if (emp.commissionCalcType === 'actual_work_days_all_branches') {
    return hasScheduledShift(data, emp.id, branchId, date);
  }

  return hasScheduledShift(data, emp.id, branchId, date);
}

function commissionBranchesInScope(responsibleBranches, branchFilter) {
  const branches = responsibleBranches.filter(Boolean);
  if (branchFilter === 'all') return branches;
  return branches.filter((branchId) => String(branchId) === String(branchFilter));
}

function countCommissionDays(data, emp, responsibleBranches, periodDays, branchFilter) {
  if (emp.commissionEnabled === false) return 0;

  const scopedBranches = commissionBranchesInScope(responsibleBranches, branchFilter);
  if (!scopedBranches.length) return 0;

  if (emp.commissionCalcType === 'period_days_responsible_branches') {
    return periodDays.length;
  }

  return periodDays.filter((date) => (
    scopedBranches.some((branchId) => (
      hasScheduledShift(data, emp.id, branchId, date)
    ))
  )).length;
}

export default function CommissionDashboard({ data: initialData, user, currentBranch, from, to }) {
  const { push } = useToast();
  const { data, loading, refreshCommissionData } = useCommission(initialData, push);
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [computed, setComputed] = useState([]);

  const branches = useMemo(() => (data?.branches || []).map((b) => ({ id: b.id, code: b.code, name: b.name })), [data]);
  const employees = useMemo(() => data?.employees || [], [data]);
  const sales = useMemo(() => data?.sales || [], [data]);
  const periodDays = useMemo(() => {
    const start = from || data?.initialDate;
    const end = to || data?.initialDateTo || start;
    return start && end ? dateRange(start, end) : [];
  }, [from, to, data]);

  function computeAll() {
    const rows = employees.map((emp) => {
      const responsibleBranches = getResponsibleBranches(data, emp, emp.branch);
      const commissionEnabled = emp.commissionEnabled !== false;
      const eligibleSales = commissionEnabled ? sales.filter((sale) => {
        if (!periodDays.includes(sale.date)) return false;
        if (branchFilter !== 'all' && String(sale.bid) !== String(branchFilter)) return false;
        return saleMatchesCommissionType(data, emp, sale, responsibleBranches, periodDays);
      }) : [];
      const total = eligibleSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const rate = Number(emp.commissionRate || 0) / 100;
      const commission = Math.round(total * rate);
      const eligibleDays = countCommissionDays(data, emp, responsibleBranches, periodDays, branchFilter);
      const branchObj = branches.find((b) => String(b.id) === String(emp.branch)) || {};
      return {
        empId: emp.id,
        name: emp.name,
        code: emp.code || emp.id,
        branchId: emp.branch,
        branchCode: branchObj.code || '',
        branchName: branchObj.name || '',
        responsibleBranches,
        eligibleDays,
        sales: total,
        tier: commissionEnabled ? COMMISSION_TYPE_LABELS[emp.commissionCalcType] || COMMISSION_TYPE_LABELS.scheduled_assigned_branch_days : 'ไม่คิดค่าคอม',
        rate,
        commission,
        status: total > 0 ? 'calculated' : 'none'
      };
    });

    setComputed(rows);
    push && push('คำนวณค่าคอมมิชชันเรียบร้อย');
  }

  useEffect(() => {
    computeAll();
  }, [data, branchFilter, search, from, to]);

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
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-slate-200 rounded-lg col-span-1" />
            <div className="h-24 bg-slate-200 rounded-lg col-span-1" />
            <div className="h-24 bg-slate-200 rounded-lg col-span-1" />
            <div className="h-24 bg-slate-200 rounded-lg col-span-1" />
          </div>
          <div className="h-8 bg-slate-200 rounded-lg w-full" />
          <div className="h-48 bg-slate-200 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">💰 ระบบคำนวณค่าคอมมิชชันพนักงาน</h2>
        <div className="flex items-center gap-3">
          <button onClick={computeAll} className="btn btn-ghost flex items-center gap-2"><RefreshCw size={16} /> คำนวณค่าคอมมิชชัน</button>
          <button onClick={exportCsv} className="btn btn-ghost flex items-center gap-2"><Download size={16} /> Export Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-white rounded-xl shadow-md">
          <div className="text-sm text-slate-500">ยอดขายรวม</div>
          <div className="text-2xl font-bold">฿{money(summary.totalSales)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md">
          <div className="text-sm text-slate-500">ค่าคอมรวม</div>
          <div className="text-2xl font-bold">฿{money(summary.totalCommission)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md">
          <div className="text-sm text-slate-500">พนักงานที่ได้คอม</div>
          <div className="text-2xl font-bold">{summary.earners}</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md">
          <div className="text-sm text-slate-500">จำนวนวันที่คิดคอม</div>
          <div className="text-2xl font-bold">{summary.totalDays}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setBranchFilter('all')} className={`px-3 py-2 rounded-full shadow ${branchFilter==='all' ? 'bg-green-700 text-white' : 'bg-white'}`}>ALL</button>
          {branches.map((b) => (
            <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-2 rounded-full shadow ${String(branchFilter)===String(b.id) ? 'bg-green-700 text-white' : 'bg-white'}`}>{b.code}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา ชื่อ / รหัส / สาขา" className="input w-80" />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
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
                  <td className="p-3 font-semibold">{r.name} <div className="text-xs text-slate-500">{r.code}</div></td>
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
  );
}
