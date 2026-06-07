import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Eye, Pencil, Check, Lock, Unlock, FileText, AlertCircle, Wallet, CreditCard, Landmark, User } from 'lucide-react';
import { salesDashboardService } from './services/salesDashboardService';
import {
  branchById,
  filteredDeposits,
  filteredSales,
  money,
  shortDate,
  tabs,
  timeText
} from './salesDashboardUtils';
import {
  StatCard,
  StatusBadge,
  DepositStatusBadge,
  EmployeeChip,
  BankChip,
  SalesLogModal,
  SalesEditorModal,
  DepositEditorModal,
  AccountFormModal
} from './components/SalesDashboardComponents';

function getMonthRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().slice(0, 10),
    end: lastDay.toISOString().slice(0, 10)
  };
}

export default function SaleDashboard({ data, user, currentBranch, from, to }) {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState(data.sales);
  const [deposits, setDeposits] = useState(data.deposits);
  const [bankAccounts, setBankAccounts] = useState(data.bankAccounts);
  const monthRange = getMonthRange();
  const [filterFrom, setFilterFrom] = useState(monthRange.start);
  const [filterTo, setFilterTo] = useState(monthRange.end);
  const [modalSale, setModalSale] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setSales(data.sales);
    setDeposits(data.deposits);
    setBankAccounts(data.bankAccounts);
  }, [data.sales, data.deposits, data.bankAccounts]);

  useEffect(() => {
    if (from && to) {
      setFilterFrom(from);
      setFilterTo(to);
    }
  }, [from, to]);

  const localData = useMemo(() => ({ ...data, sales, deposits, bankAccounts }), [data, sales, deposits, bankAccounts]);
  const visibleSales = useMemo(() => filteredSales(localData, user, currentBranch, filterFrom, filterTo), [localData, user, currentBranch, filterFrom, filterTo]);
  const visibleDeposits = useMemo(() => filteredDeposits(localData, user, currentBranch, filterFrom, filterTo), [localData, user, currentBranch, filterFrom, filterTo]);

  function flash(message, type = 'ok') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  }

  async function confirmSale(sale) {
    try {
      await salesDashboardService.updateSale(sale.id, {
        status: 'confirmed',
        confirmedBy: user.username,
        confirmedAt: new Date().toISOString(),
        reason: 'ยืนยันยอดผ่าน Sales Dashboard'
      });
      setSales((rows) => rows.map((row) => row.id === sale.id ? { ...row, status: 'confirmed', confirmedBy: user.username, confirmTime: new Date().toISOString() } : row));
      flash('ยืนยันยอดเงินสำเร็จคลังจัดเก็บเข้าบัญชีหลักแล้ว');
    } catch (error) {
      flash(error.message || 'ยืนยันยอดไม่สำเร็จ', 'err');
    }
  }

  async function verifyDeposit(deposit) {
    try {
      await salesDashboardService.updateCashDeposit(deposit.id, {
        status: 'verified',
        verifiedBy: user.username,
        verifiedAt: new Date().toISOString()
      });
      setDeposits((rows) => rows.map((row) => row.id === deposit.id ? { ...row, status: 'verified', verifiedBy: user.username, verifyTime: new Date().toISOString() } : row));
      flash('ตรวจสอบเอกสารและยืนยันรับยอดเรียบร้อย');
    } catch (error) {
      flash(error.message || 'ยืนยันสลิปไม่สำเร็จ', 'err');
    }
  }

  async function toggleBankAccount(account) {
    try {
      await salesDashboardService.updateBankAccount(account.id, { isActive: !account.active });
      setBankAccounts((rows) => rows.map((row) => row.id === account.id ? { ...row, active: !row.active } : row));
      flash('เปลี่ยนแปลงสถานะการเปิดรับยอดของระบบธนาคารแล้ว');
    } catch (error) {
      flash(error.message || 'เปลี่ยนสถานะไม่สำเร็จ', 'err');
    }
  }

  const upsertSale = (sale, isEdit) => setSales((rows) => isEdit ? rows.map((r) => r.id === sale.id ? { ...r, ...sale } : r) : [...rows, sale]);
  const upsertDeposit = (dep, isEdit) => setDeposits((rows) => isEdit ? rows.map((r) => r.id === dep.id ? { ...r, ...dep } : r) : [...rows, dep]);
  const updateAccount = (acc) => setBankAccounts((rows) => rows.map((r) => r.id === acc.id ? { ...r, ...acc } : r));

  const renderSalesTab = () => {
    const totalSales = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCash = visibleSales.reduce((sum, sale) => sum + sale.cash, 0);
    const totalQr = visibleSales.reduce((sum, sale) => sum + sale.qr + sale.transfer, 0);
    const totalCredit = visibleSales.reduce((sum, sale) => sum + sale.credit, 0);

    const byBranch = localData.branches
      .map((branch) => ({ branch, rows: visibleSales.filter((sale) => String(sale.bid) === String(branch.id)) }))
      .filter((item) => item.rows.length);

    const pendingSales = visibleSales.filter((sale) => sale.status !== 'confirmed');
    const confirmedSales = visibleSales.filter((sale) => sale.status === 'confirmed');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={`฿${money(totalSales)}`} label="ยอดขายรวมทั้งหมด" tone="green" icon={Wallet} />
          <StatCard value={`฿${money(totalCash)}`} label="เงินสดหน้าร้าน" tone="blue" icon={Wallet} />
          <StatCard value={`฿${money(totalQr)}`} label="QR Code / เงินโอน" tone="purple" icon={Landmark} />
          <StatCard value={`฿${money(totalCredit)}`} label="บัตรเครดิต" tone="orange" icon={CreditCard} />
        </div>

        <div className="flex gap-2 text-xs font-semibold">
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">รอยืนยันยอด {visibleSales.filter((s) => s.status === 'draft').length} รายการ</span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg">มีประวัติแก้ไข {visibleSales.filter((s) => s.status === 'edited' || s.editLog?.length).length} รายการ</span>
        </div>

        {currentBranch === 'all' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">สรุปยอดขายแยกตามสาขา</h3>
              <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline" onClick={() => setEditor({ type: 'sale', mode: 'create' })}><Plus size={14} /> เพิ่มยอดขาย</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byBranch.map(({ branch, rows }) => {
                const latest = rows.at(-1);
                const branchTotal = rows.reduce((sum, r) => sum + r.total, 0);
                return (
                  <div key={branch.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3 relative hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-base font-bold text-gray-900">{branch.code}</div>
                        <div className="text-xs text-gray-400 font-medium">{branch.name}</div>
                      </div>
                      <StatusBadge status={latest.status} />
                    </div>
                    <div className="text-xl font-black text-gray-900">฿{money(branchTotal)}</div>
                    <div className="grid grid-cols-3 gap-1 bg-gray-50 p-2 rounded-lg text-center text-[11px] font-bold text-gray-600">
                      <div><div>สด</div><div className="text-gray-900">฿{money(rows.reduce((s, r) => s + r.cash, 0))}</div></div>
                      <div><div>โอน</div><div className="text-gray-900">฿{money(rows.reduce((s, r) => s + r.qr + r.transfer, 0))}</div></div>
                      <div><div>บัตร</div><div className="text-gray-900">฿{money(rows.reduce((s, r) => s + r.credit, 0))}</div></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-2">
                      <div className="flex items-center gap-1"><User size={10} /><span className="truncate max-w-[80px]">{latest.submittedBy || '—'}</span></div>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-600" onClick={() => setEditor({ type: 'sale', mode: 'view', item: latest })}><Eye size={12} /></button>
                        <button className="p-1 hover:bg-gray-100 rounded text-blue-600" onClick={() => setEditor({ type: 'sale', mode: 'edit', item: latest })}><Pencil size={12} /></button>
                        <button className="p-1 hover:bg-gray-100 rounded text-purple-600" onClick={() => setModalSale(latest)}><FileText size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h4 className="text-sm font-bold text-gray-700">ยอดขายยังไม่ได้อนุมัติ / แก้ไข</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider font-bold border-b border-gray-100 text-[10px]">
                  <th className="p-3">วันที่</th>
                  <th className="p-3">ยอดรวม</th>
                  <th className="p-3">เงินสด</th>
                  <th className="p-3">QR/โอน</th>
                  <th className="p-3">เครดิต</th>
                  <th className="p-3">ส่งโดย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {pendingSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{shortDate(sale.date)}</td>
                    <td className="p-3 text-sm font-black text-blue-600">฿{money(sale.total)}</td>
                    <td className="p-3">฿{money(sale.cash)}</td>
                    <td className="p-3">฿{money(sale.qr + sale.transfer)}</td>
                    <td className="p-3">฿{money(sale.credit)}</td>
                    <td className="p-3"><EmployeeChip data={localData} employeeId={sale.submittedBy} time={sale.submitTime} /></td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button className="p-1 hover:bg-white rounded text-gray-500 transition-all" onClick={() => setEditor({ type: 'sale', mode: 'view', item: sale })}><Eye size={13} /></button>
                        <button className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-all" onClick={() => confirmSale(sale)}><Check size={13} /></button>
                        <button className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-all" onClick={() => setEditor({ type: 'sale', mode: 'edit', item: sale })}><Pencil size={13} /></button>
                        <button className="p-1 hover:bg-purple-50 rounded text-purple-600 transition-all" onClick={() => setModalSale(sale)}><FileText size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pendingSales.length && <tr><td colSpan="8" className="p-8 text-center text-gray-400 font-medium">🎉 ไม่มียอดขายรอยืนยัน</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h4 className="text-sm font-bold text-gray-500">ยอดขายยืนยันแล้ว</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-400 border-b border-gray-100 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-3">วันที่</th>
                  <th className="p-3">ยอดรวม</th>
                  <th className="p-3">เงินสด</th>
                  <th className="p-3">QR/โอน</th>
                  <th className="p-3">เครดิต</th>
                  <th className="p-3">ส่งโดย</th>
                  <th className="p-3">ยืนยัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-600">
                {confirmedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/40 text-gray-500">
                    <td className="p-3 font-semibold text-gray-700">{shortDate(sale.date)}</td>
                    <td className="p-3 font-bold text-gray-900">฿{money(sale.total)}</td>
                    <td className="p-3">฿{money(sale.cash)}</td>
                    <td className="p-3">฿{money(sale.qr + sale.transfer)}</td>
                    <td className="p-3">฿{money(sale.credit)}</td>
                    <td className="p-3"><EmployeeChip data={localData} employeeId={sale.submittedBy} time={sale.submitTime} /></td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-gray-600 font-medium text-[11px]">
                        <Check size={12} className="text-emerald-500" />
                        {sale.confirmedBy} <span className="text-gray-400">({timeText(sale.confirmTime)})</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" onClick={() => setEditor({ type: 'sale', mode: 'view', item: sale })}><Eye size={13} /></button>
                        <button className="p-1 text-gray-300 cursor-not-allowed" disabled><Lock size={13} /></button>
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-600" onClick={() => setModalSale(sale)}><FileText size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!confirmedSales.length && <tr><td colSpan="8" className="p-6 text-center text-gray-400">ยังไม่มียอดขายที่ยืนยันแล้ว</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDepositTab = () => {
    const done = visibleDeposits.filter((d) => Number(d.deposited) > 0).length;
    const mismatch = visibleDeposits.filter((d) => Number(d.deposited) && Number(d.deposited) !== Number(d.expected)).length;
    const pendingDeposits = visibleDeposits.filter((d) => d.status !== 'verified');
    const verifiedDeposits = visibleDeposits.filter((d) => d.status === 'verified');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard tone="teal" value={`${done} / ${visibleDeposits.length}`} label="ส่งฝากสลิปแล้ว" icon={FileText} />
          <StatCard tone={mismatch ? 'red' : 'green'} value={mismatch} label="ยอดไม่ตรงสลิป" icon={AlertCircle} />
          <StatCard value={`฿${money(visibleDeposits.reduce((sum, item) => sum + item.expected, 0))}`} label="ยอดเงินสดที่ต้องนำฝาก" tone="blue" icon={Wallet} />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700">รายการฝากเงินยังไม่ตรวจสอบ</h3>
            <button className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors" onClick={() => setEditor({ type: 'deposit', mode: 'create' })}><Plus size={13} /> เพิ่มฝากเงินสด</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 border-b border-gray-100 font-bold tracking-wider uppercase text-[10px]">
                  <th className="p-3">สาขา</th>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">เงินสดหน้าร้าน</th>
                  <th className="p-3">ยอดเงินฝากจริง</th>
                  <th className="p-3">บัญชีปลายทาง</th>
                  <th className="p-3">คนนำฝาก</th>
                  <th className="p-3">สถานะตรวจ</th>
                  <th className="p-3 text-right">ระบบตรวจสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {pendingDeposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{branchById(localData, deposit.bid)?.code || deposit.bid}</td>
                    <td className="p-3">{shortDate(deposit.date)}</td>
                    <td className="p-3 font-semibold text-gray-500">฿{money(deposit.expected)}</td>
                    <td className="p-3 font-bold text-gray-900">{deposit.deposited ? `฿${money(deposit.deposited)}` : '—'}</td>
                    <td className="p-3"><BankChip data={localData} accountId={deposit.bankAccId} /></td>
                    <td className="p-3"><EmployeeChip data={localData} employeeId={deposit.depositedBy} /></td>
                    <td className="p-3"><DepositStatusBadge deposit={deposit} /></td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button className="p-1 hover:bg-white rounded text-gray-500" onClick={() => setEditor({ type: 'deposit', mode: 'view', item: deposit })}><Eye size={13} /></button>
                        <button className="p-1 hover:bg-white rounded text-blue-600" onClick={() => setEditor({ type: 'deposit', mode: 'edit', item: deposit })}><Pencil size={13} /></button>
                        {deposit.deposited ? <button className="p-1 hover:bg-emerald-50 rounded text-emerald-600 font-bold text-[10px] px-1.5 flex items-center gap-0.5" onClick={() => verifyDeposit(deposit)}><Check size={12} /> ยืนยันรับเข้า</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!pendingDeposits.length && <tr><td colSpan="8" className="p-6 text-center text-gray-400">ไม่พบรายการฝากเงินที่ต้องตรวจสอบ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-gray-50/50 border-b border-gray-100"><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">รายการฝากเงินตรวจสอบแล้ว</h4></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500 border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100 text-[10px] uppercase font-bold">
                  <th className="p-3">สาขา</th><th className="p-3">วันที่</th><th className="p-3">เงินสดหน้าร้าน</th><th className="p-3">ยอดเงินฝากจริง</th><th className="p-3">บัญชีปลายทาง</th><th className="p-3">คนนำฝาก</th><th className="p-3 text-right">เครื่องมือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {verifiedDeposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-50/40">
                    <td className="p-3 font-semibold text-gray-700">{branchById(localData, deposit.bid)?.code || deposit.bid}</td>
                    <td className="p-3">{shortDate(deposit.date)}</td>
                    <td className="p-3">฿{money(deposit.expected)}</td>
                    <td className="p-3 font-bold text-gray-800">฿{money(deposit.deposited)}</td>
                    <td className="p-3"><BankChip data={localData} accountId={deposit.bankAccId} /></td>
                    <td className="p-3"><EmployeeChip data={localData} employeeId={deposit.depositedBy} /></td>
                    <td className="p-3 text-right">
                      <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setEditor({ type: 'deposit', mode: 'view', item: deposit })}><Eye size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAccountTab = () => {
    const activeAccounts = bankAccounts.filter((account) => account.active);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAccounts.map((account) => {
            const accountDeposits = deposits.filter((deposit) => String(deposit.bankAccId) === String(account.id) && visibleDeposits.some((item) => item.id === deposit.id));
            const sum = accountDeposits.reduce((total, deposit) => total + deposit.deposited, 0);
            return (
              <div key={account.id} className="bg-white border-l-4 rounded-xl shadow-sm border-y border-r border-gray-100 p-4 space-y-3" style={{ borderLeftColor: account.color }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{account.bank}</h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{account.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 font-medium">ยอดรวม</div>
                    <div className="text-base font-black text-gray-900">฿{money(sum)}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1 text-gray-600 font-medium">
                  <div className="flex justify-between"><span>เลขที่บัญชี</span><span className="text-gray-900 font-bold font-mono">{account.accNo}</span></div>
                  <div className="flex justify-between"><span>ชื่อบัญชี</span><span className="text-gray-900 font-bold">{account.accName}</span></div>
                  <div className="flex justify-between"><span>จำนวนสลิปเข้า</span><span className="text-blue-600 font-bold">{accountDeposits.length} รายการ</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-700">ตารางเงินเข้าบัญชีรายวันรวม</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider border-b border-gray-100">
                  <th className="p-3">วันที่นำฝาก</th>
                  {activeAccounts.map((account) => <th key={account.id} className="p-3 text-center">{account.bankShort}</th>)}
                  <th className="p-3 text-right">ยอดรวมวัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {[...new Set(visibleDeposits.filter((deposit) => deposit.deposited).map((deposit) => deposit.date))].sort().map((date) => {
                  const dayDeposits = visibleDeposits.filter((deposit) => deposit.date === date);
                  return (
                    <tr key={date} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{shortDate(date)}</td>
                      {activeAccounts.map((account) => {
                        const amount = dayDeposits.filter((deposit) => String(deposit.bankAccId) === String(account.id)).reduce((sum, deposit) => sum + deposit.deposited, 0);
                        return <td key={account.id} className={`p-3 text-center ${amount ? 'font-bold text-gray-900' : 'text-gray-300'}`}>{amount ? `฿${money(amount)}` : '—'}</td>;
                      })}
                      <td className="p-3 text-right font-black text-sm text-blue-600 bg-blue-50/30">฿{money(dayDeposits.reduce((sum, deposit) => sum + deposit.deposited, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderManageTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-800">บัญชีธนาคารรับเงินทั้งหมดในระบบ</h3>
        </div>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors" onClick={() => setShowAccountForm(true)}><Plus size={14} /> เพิ่มบัญชีรับเงิน</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.map((account) => (
          <div key={account.id} className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all ${account.active ? 'border-gray-100' : 'border-gray-200 bg-gray-50/40 opacity-70'}`}>
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: account.active ? account.color : '#ccc' }} />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{account.bank} <span className="text-xs text-gray-400">({account.bankShort})</span></h4>
                  <span className="text-[11px] font-mono font-bold text-gray-500">{account.accNo}</span>
                </div>
              </div>
              <button className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 shadow-sm transition-all ${account.active ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`} onClick={() => toggleBankAccount(account)}>
                {account.active ? <><Lock size={12} /> ปิดชั่วคราว</> : <><Unlock size={12} /> เปิดใช้งาน</>}
              </button>
            </div>

            <div className="text-xs font-medium text-gray-600 pt-3 flex justify-between items-center">
              <div>ชื่อบัญชี: <span className="font-bold text-gray-900">{account.accName}</span></div>
              <div className="flex gap-1.5">
                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" onClick={() => setEditor({ type: 'account', mode: 'view', item: account })}><Eye size={13} /></button>
                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600" onClick={() => setEditor({ type: 'account', mode: 'edit', item: account })}><Pencil size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl p-4 lg:p-6 space-y-6">
      <div className="flex border-b border-gray-200 overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button key={tab.id} className={`px-5 py-2.5 font-bold text-sm border-b-2 whitespace-nowrap transition-all outline-none ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-200">
        {activeTab === 'sales' && renderSalesTab()}
        {activeTab === 'deposit' && renderDepositTab()}
        {activeTab === 'account' && renderAccountTab()}
        {activeTab === 'manage' && renderManageTab()}
      </div>

      <SalesLogModal data={localData} sale={modalSale} onClose={() => setModalSale(null)} />
      {showAccountForm && <AccountFormModal onClose={() => setShowAccountForm(false)} onSaved={flash} onCreated={(acc) => setBankAccounts((rows) => [...rows, acc])} onUpdated={updateAccount} />}
      {editor?.type === 'sale' && <SalesEditorModal data={localData} sale={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertSale} />}
      {editor?.type === 'deposit' && <DepositEditorModal data={localData} deposit={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertDeposit} />}
      {editor?.type === 'account' && <AccountFormModal account={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onCreated={(acc) => setBankAccounts((rows) => [...rows, acc])} onUpdated={updateAccount} />}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-150">
          <div className={`px-4 py-2.5 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 ${toast.type === 'err' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
            <AlertCircle size={16} className={toast.type === 'err' ? 'text-rose-500' : 'text-emerald-500'} />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
