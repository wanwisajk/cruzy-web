import React, { useEffect, useMemo, useState } from 'react';
import { 
  Plus, Eye, Pencil, Check, Lock, Unlock, 
  X, FileText, Calendar, Wallet, CreditCard, 
  ArrowRight, AlertCircle, Landmark, User
} from 'lucide-react';
import { hydrateConsoleData } from '../lib/hydrate';
import { salesDashboardService } from '../features/salesDashboard/services/salesDashboardService';
import {
  branchById,
  depositStatus,
  filteredDeposits,
  filteredSales,
  money,
  shortDate,
  statusBadge,
  tabs,
  timeText,
  rawSalesText,
  accountById,
  employeeById
} from '../features/salesDashboard/salesDashboardUtils';

// ==========================================
// 1. SHARED MINI COMPONENTS (UI Elements)
// ==========================================

function StatCard({ tone = 'green', value, label, icon: Icon }) {
  const toneClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-amber-50 border-amber-200 text-amber-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    red: 'bg-rose-50 border-rose-200 text-rose-700'
  };

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${toneClasses[tone] || toneClasses.green}`}>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs font-medium opacity-80 mt-0.5">{label}</div>
      </div>
      {Icon && <Icon className="w-8 h-8 opacity-40 stroke-[1.5]" />}
    </div>
  );
}

function StatusBadge({ status }) {
  const badge = statusBadge(status);
  const colorMap = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    edited: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colorMap[badge.className] || 'bg-gray-100'}`}>
      {badge.label}
    </span>
  );
}

function DepositStatusBadge({ deposit }) {
  const status = depositStatus(deposit);
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  
  if (status.className === 'waiting') colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  if (status.className === 'match') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status.className === 'mismatch') colorClass = 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorClass}`}>
      {status.label}
    </span>
  );
}

function EmployeeChip({ data, employeeId, time }) {
  const employee = employeeById(data, employeeId);
  if (!employee) {
    return (
      <span className="inline-flex items-center text-xs text-gray-500 font-medium">
        {employeeId || '—'}{time ? ` • ${timeText(time)}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
      <span className="w-4 h-4 rounded-full text-[9px] text-white flex items-center justify-center font-bold" style={{ background: employee.color }}>
        {(employee.nickname || employee.name || '?')[0]}
      </span>
      <span className="truncate max-w-[80px]">{employee.nickname || employee.name}</span>
      {time && <span className="text-gray-400 font-normal">({timeText(time)})</span>}
    </span>
  );
}

function BankChip({ data, accountId }) {
  const account = accountById(data, accountId);
  if (!account) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded text-white font-semibold tracking-wide shadow-sm" style={{ background: account.color }}>
      {account.bankShort} *{String(account.accNo || '').slice(-3)}
    </span>
  );
}

function ModalFrame({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-5 flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function ViewRows({ rows }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-gray-200/60 pb-1.5 sm:border-none sm:pb-0">
          <span className="text-sm text-gray-500 font-medium">{label}</span>
          <span className="text-sm text-gray-900 font-bold">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

function ImagePreviewGrid({ images = [] }) {
  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 bg-gray-50">
        <AlertCircle size={24} className="stroke-[1.5] mb-1" />
        <span className="text-xs font-medium">ไม่มีรูปภาพหรือหลักฐานแนบ</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {images.map((image, index) => {
        const url = image.fileUrl || image;
        return (
          <a href={url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 hover:shadow-md transition-all" key={image.id || index}>
            <img src={url} alt={`attachment-${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </a>
        );
      })}
    </div>
  );
}

// ==========================================
// 2. MODAL LAYERS COMPONENT
// ==========================================

function SalesLogModal({ data, sale, onClose }) {
  if (!sale) return null;
  const branch = branchById(data, sale.bid);
  const submittedBy = employeeById(data, sale.submittedBy);
  
  return (
    <ModalFrame title={`เส้นทางธุรกรรม LINE Webhook — ${branch?.code || sale.bid}`} onClose={onClose} footer={<button className="px-4 py-2 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors" onClick={onClose}>ปิดหน้าต่าง</button>}>
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-3 font-medium">
        <Calendar size={16} className="text-blue-500" />
        <span><b>สาขา:</b> {branch?.code || sale.bid}</span>
        <span className="text-gray-300">|</span>
        <span><b>วันที่ขาย:</b> {shortDate(sale.date)}</span>
      </div>
      
      <div className="relative border-l-2 border-gray-200 ml-3 pl-5 space-y-6 py-2">
        <div className="relative">
          <span className="absolute -left-[27px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
          <div className="text-xs font-bold text-blue-600 tracking-wide mb-0.5">{timeText(sale.submitTime) || '—'}</div>
          <div className="text-sm font-bold text-gray-800">ระบบได้รับยอดขายอัตโนมัติ</div>
          <div className="text-xs text-gray-500 mt-0.5">ส่งโดย: {submittedBy?.nickname || submittedBy?.name || sale.submittedBy || '—'}</div>
        </div>

        {(sale.editLog || []).map((log, index) => (
          <div className="relative" key={log.id || `${log.field}_${log.time}_${index}`}>
            <span className="absolute -left-[27px] top-0 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white" />
            <div className="text-xs font-bold text-amber-600 tracking-wide mb-0.5">{timeText(log.time) || '—'}</div>
            <div className="text-sm font-bold text-gray-800">แก้ไขฟิลด์ข้อมูล <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-mono">[{log.field}]</span></div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
              <span className="line-through text-gray-400">{log.from || '—'}</span>
              <ArrowRight size={12} />
              <span className="text-gray-700 font-semibold">{log.to || '—'}</span>
            </div>
            {log.reason && <div className="text-xs italic text-amber-700 mt-1">เหตุผล: "{log.reason}"</div>}
          </div>
        ))}

        {sale.confirmedBy && (
          <div className="relative">
            <span className="absolute -left-[27px] top-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
            <div className="text-xs font-bold text-emerald-600 tracking-wide mb-0.5">{timeText(sale.confirmTime) || '—'}</div>
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-1">ตรวจสอบและยืนยันยอดเรียบร้อย <Check size={14} /></div>
            <div className="text-xs text-gray-500 mt-0.5">ผู้อนุมัติ: {sale.confirmedBy}</div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อความต้นฉบับจาก LINE Chat</div>
        <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-40">{rawSalesText(sale)}</pre>
      </div>
    </ModalFrame>
  );
}

function SalesEditorModal({ data, sale, mode, onClose, onSaved, onUpsert, onRefresh }) {
  const isLocked = sale?.status === 'confirmed';
  const readonly = mode === 'view' || isLocked;
  const currentBranch = data.branches[0]?.id || '';
  
  const [form, setForm] = useState({
    sellDate: sale?.date || new Date().toISOString().slice(0, 10),
    branchId: sale?.bid || currentBranch,
    cashAmount: sale?.cash || 0,
    transferAmount: sale?.transfer || 0,
    qrAmount: sale?.qr || 0,
    creditAmount: sale?.credit || 0,
    totalAmount: sale?.total || 0,
    submittedBy: sale?.submittedBy || '',
    submittedAt: sale?.submitTime || '',
    status: sale?.status || 'draft',
    rawText: sale?.rawText || ''
  });
  const [newImages, setNewImages] = useState([]);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    const next = { ...form, [field]: value };
    if (['cashAmount', 'transferAmount', 'qrAmount', 'creditAmount'].includes(field)) {
      next.totalAmount = Number(next.cashAmount || 0) + Number(next.transferAmount || 0) + Number(next.qrAmount || 0) + Number(next.creditAmount || 0);
    }
    setForm(next);
  }

  async function filesToDataUrls(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    return Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        sellDate: form.sellDate,
        branchId: form.branchId,
        cashAmount: form.cashAmount,
        transferAmount: form.transferAmount,
        qrAmount: form.qrAmount,
        creditAmount: form.creditAmount,
        totalAmount: form.totalAmount,
        submittedBy: form.submittedBy || null,
        status: form.status,
        rawText: form.rawText || null,
        submittedAt: form.submittedAt ? `${form.sellDate}T${form.submittedAt.length === 5 ? `${form.submittedAt}:00` : form.submittedAt}` : null
      };
      const result = sale ? await salesDashboardService.updateSale(sale.id, payload) : await salesDashboardService.createSale(payload);
      
      const normalizeSaleLocal = (row) => ({
        id: String(row.id), date: row.sell_date || row.date, bid: row.branch_id || row.bid,
        total: Number(row.total_amount ?? row.total ?? 0), cash: Number(row.cash_amount ?? row.cash ?? 0),
        transfer: Number(row.transfer_amount ?? row.transfer ?? 0), credit: Number(row.credit_amount ?? row.credit ?? 0),
        qr: Number(row.qr_amount ?? row.qr ?? 0), submittedBy: row.submitted_by || row.submittedBy || null,
        submitTime: timeText(row.submitted_at || row.submitTime), confirmedBy: row.confirmed_by || row.confirmedBy || null,
        confirmTime: timeText(row.confirmed_at || row.confirmTime), status: row.status || 'draft',
        rawText: row.raw_text || row.rawText || '', editLog: row.editLog || [], attachments: row.attachments || []
      });

      const saved = normalizeSaleLocal(result.data);
      if (newImages.length) {
        const created = await salesDashboardService.createAttachments(newImages.map((fileUrl) => ({
          entityType: 'sale', entityId: saved.id, fileUrl
        })));
        saved.attachments = [...(sale?.attachments || []), ...(created.data || []).map(r => ({
          id: String(r.id), entityType: r.entity_type || r.entityType, entityId: String(r.entity_id || r.entityId), fileUrl: r.file_url || r.fileUrl
        }))];
      } else {
        saved.attachments = sale?.attachments || saved.attachments || [];
      }
      onUpsert(saved, Boolean(sale));
      await onRefresh?.();
      onSaved(sale ? 'แก้ไขยอดขายสำเร็จ' : 'เพิ่มยอดขายสำเร็จ');
      onClose();
    } catch (error) {
      onSaved(error.message || 'บันทึกยอดขายไม่สำเร็จ', 'err');
    } finally {
      setSaving(false);
    }
  }

  if (readonly) {
    const branch = branchById(data, sale.bid);
    return (
      <ModalFrame title={isLocked ? '🔒 ยอดขายถูกล็อก (ยืนยันแล้ว)' : 'รายละเอียดข้อมูลยอดขาย'} onClose={onClose} footer={<button className="px-5 py-2 font-semibold text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors" onClick={onClose}>รับทราบ</button>}>
        {isLocked && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-1.5"><Lock size={14} /> ยอดขายรายการนี้เสร็จสมบูรณ์แล้ว ระบบล็อกไม่ให้แก้ไขเพื่อความปลอดภัยทางบัญชี</div>}
        <ViewRows rows={[
          ['สาขา', `${branch?.code || sale.bid} — ${branch?.name || ''}`],
          ['วันที่ทำรายการ', shortDate(sale.date)],
          ['💵 เงินสดหน้าร้าน', `฿${money(sale.cash)}`],
          ['📱 ยอดโอนเงิน', `฿${money(sale.transfer)}`],
          ['QR Code Payment', `฿${money(sale.qr)}`],
          ['💳 บับัตรเครดิต', `฿${money(sale.credit)}`],
          ['💰 ยอดขายสุทธิรวม', `฿${money(sale.total)}`],
          ['สถานะปัจจุบัน', sale.status.toUpperCase()]
        ]} />
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">เอกสารภาพถ่าย/สลิปรายวัน</div>
          <ImagePreviewGrid images={sale.attachments || []} />
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame title={sale ? '✏️ แก้ไขข้อมูลยอดขายหน้าร้าน' : '➕ เพิ่มข้อมูลยอดขายใหม่'} onClose={onClose} footer={<><button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" onClick={onClose}>ยกเลิก</button><button className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลยอดขาย'}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <label className="flex flex-col gap-1 font-medium text-gray-700">วันที่ขาย<input className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" type="date" value={form.sellDate} onChange={(e) => update('sellDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">เลือกสาขา<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20" value={form.branchId} onChange={(e) => update('branchId', e.target.value)}>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">เงินสด (Cash)<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.cashAmount} onChange={(e) => update('cashAmount', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">เงินโอน (Bank Transfer)<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.transferAmount} onChange={(e) => update('transferAmount', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">คิวอาร์โค้ด (QR)<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.qrAmount} onChange={(e) => update('qrAmount', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">บัตรเครดิต (Credit Card)<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.creditAmount} onChange={(e) => update('creditAmount', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ยอดรวมทั้งสิ้น (Auto)<input className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none" type="number" value={form.totalAmount} readOnly /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ผู้ส่งยอดขาย<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none" value={form.submittedBy} onChange={(e) => update('submittedBy', e.target.value)}><option value="">- ไม่ระบุ -</option>{data.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.nickname || emp.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">เวลาส่งข้อมูล<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="time" value={form.submittedAt} onChange={(e) => update('submittedAt', e.target.value)} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">สถานะระบบ<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white" value={form.status} onChange={(e) => update('status', e.target.value)}><option value="draft">รอยืนยันตรวจสอบ</option><option value="confirmed">ยืนยันยอดถูกต้อง</option><option value="edited">มีประวัติแก้ไขเสร็จแล้ว</option></select></label>
        
        <div className="sm:col-span-2 flex flex-col gap-1 font-medium text-gray-700">
          <span>แนบไฟล์รูปภาพยอดขาย</span>
          <input className="px-3 py-2 border border-gray-200 rounded-xl text-xs" type="file" accept="image/*" multiple onChange={async (e) => setNewImages(await filesToDataUrls(e.target.files))} />
        </div>
        <div className="sm:col-span-2"><ImagePreviewGrid images={[...(sale?.attachments || []), ...newImages]} /></div>
        <label className="sm:col-span-2 flex flex-col gap-1 font-medium text-gray-700">Raw Chat Text จาก LINE<textarea className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none" rows={3} value={form.rawText} onChange={(e) => update('rawText', e.target.value)} /></label>
      </div>
    </ModalFrame>
  );
}

function DepositEditorModal({ data, deposit, mode, onClose, onSaved, onUpsert, onRefresh }) {
  const isLocked = deposit?.status === 'verified';
  const readonly = mode === 'view' || isLocked;
  const [form, setForm] = useState({
    depositDate: deposit?.date || new Date().toISOString().slice(0, 10),
    branchId: deposit?.bid || data.branches[0]?.id || '',
    expectedAmount: deposit?.expected || 0,
    depositedAmount: deposit?.deposited || 0,
    bankAccountId: deposit?.bankAccId || '',
    depositedBy: deposit?.depositedBy || '',
    slipUrl: deposit?.slipUrl || '',
    status: deposit?.status || 'waiting'
  });
  const [newSlipImages, setNewSlipImages] = useState([]);
  const [saving, setSaving] = useState(false);

  async function filesToDataUrls(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    return Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, slipUrl: form.slipUrl || null };
      const result = deposit ? await salesDashboardService.updateCashDeposit(deposit.id, payload) : await salesDashboardService.createCashDeposit(payload);
      
      const normalizeDepositLocal = (row) => ({
        id: String(row.id), date: row.deposit_date || row.date, bid: row.branch_id || row.bid,
        expected: Number(row.expected_amount ?? row.expected ?? 0), deposited: Number(row.deposited_amount ?? row.deposited ?? 0),
        slip: Boolean(row.slip_url || row.slip), bankAccId: row.bank_account_id || row.bankAccId || null,
        depositedBy: row.deposited_by || row.depositedBy || null, verifiedBy: row.verified_by || row.verifiedBy || null,
        verifyTime: timeText(row.verified_at || row.verifyTime), slipUrl: row.slip_url || row.slipUrl || '',
        attachments: row.attachments || [], status: row.status || 'waiting'
      });

      const saved = normalizeDepositLocal(result.data);
      if (newSlipImages.length) {
        const created = await salesDashboardService.createAttachments(newSlipImages.map((fileUrl) => ({
          entityType: 'cash_deposit', entityId: saved.id, fileUrl
        })));
        saved.attachments = [...(deposit?.attachments || []), ...(created.data || []).map(r => ({
          id: String(r.id), entityType: r.entity_type || r.entityType, entityId: String(r.entity_id || r.entityId), fileUrl: r.file_url || r.fileUrl
        }))];
        saved.slip = true;
      } else {
        saved.attachments = deposit?.attachments || [];
      }
      onUpsert(saved, Boolean(deposit));
      await onRefresh?.();
      onSaved(deposit ? 'แก้ไขรายการฝากเงินสำเร็จ' : 'เพิ่มรายการฝากเงินสำเร็จ');
      onClose();
    } catch (error) {
      onSaved(error.message || 'บันทึกรายการฝากเงินไม่สำเร็จ', 'err');
    } finally {
      setSaving(false);
    }
  }

  if (readonly) {
    const branch = branchById(data, deposit.bid);
    const account = accountById(data, deposit.bankAccId);
    return (
      <ModalFrame title={isLocked ? '🔒 รายการฝากเงินตรวจสอบเสร็จสิ้น' : 'รายละเอียดการฝากเงินสด'} onClose={onClose} footer={<button className="px-5 py-2 font-semibold text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors" onClick={onClose}>ปิด</button>}>
        {isLocked && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-medium flex items-center gap-1.5"><Lock size={14} /> รายการนี้นำฝากเข้าเซฟตี้โบลต์และตรวจสอบบัญชีธนาคารปลายทางแล้ว ปลอดภัยเรียบร้อย</div>}
        <ViewRows rows={[
          ['สาขาที่ทำรายการ', `${branch?.code || deposit.bid} — ${branch?.name || ''}`],
          ['วันที่ทำรายการฝาก', shortDate(deposit.date)],
          ['ยอดเงินสดหน้าร้าน', `฿${money(deposit.expected)}`],
          ['ยอดเงินนำฝากจริง', `฿${money(deposit.deposited)}`],
          ['ธนาคารบัญชีปลายทาง', account ? `${account.bankShort} (${account.accNo})` : '—'],
          ['พนักงานผู้นำฝาก', employeeById(data, deposit.depositedBy)?.nickname || deposit.depositedBy],
          ['ตรวจสอบสลิป', deposit.slip ? 'พบคลังรูปภาพหลักฐาน' : 'ไม่มีสลิป'],
          ['สถานะระบบตรวจสอบ', deposit.status]
        ]} />
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">ภาพถ่ายสลิปโอนเงิน / หลักฐานฝากตู้นิรภัย</div>
          <ImagePreviewGrid images={(deposit.attachments?.length ? deposit.attachments : [deposit.slipUrl].filter(Boolean))} />
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame title={deposit ? '✏️ แก้ไขบันทึกนำฝากเงินสด' : '➕ เพิ่มบันทึกนำฝากเงินสดใหม่'} onClose={onClose} footer={<><button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" onClick={onClose}>ยกเลิก</button><button className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลนำฝาก'}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <label className="flex flex-col gap-1 font-medium text-gray-700">วันที่ฝากเงิน<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="date" value={form.depositDate} onChange={(e) => setForm({ ...form, depositDate: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">สาขาต้นทาง<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}</select></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ยอดเงินระบบประเมิน<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.expectedAmount} onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ยอดนำฝากสลิปจริง<input className="px-3 py-2 border border-gray-200 rounded-xl outline-none" type="number" value={form.depositedAmount} onChange={(e) => setForm({ ...form, depositedAmount: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">เข้าบัญชีธนาคาร<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none" value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}><option value="">- เลือกบัญชีปลายทาง -</option>{data.bankAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.bankShort} - {acc.accNo}</option>)}</select></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">พนักงานผู้นำฝาก<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white outline-none" value={form.depositedBy} onChange={(e) => setForm({ ...form, depositedBy: e.target.value })}><option value="">- เลือกรายชื่อ -</option>{data.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.nickname || emp.name}</option>)}</select></label>
        
        <div className="sm:col-span-2 flex flex-col gap-1 font-medium text-gray-700">
          <span>อัปโหลดรูปภาพสลิปใบเสร็จ (เลือกได้หลายรูป)</span>
          <input className="px-3 py-2 border border-gray-200 rounded-xl text-xs" type="file" accept="image/*" multiple onChange={async (e) => setNewSlipImages(await filesToDataUrls(e.target.files))} />
        </div>
        <label className="sm:col-span-2 flex flex-col gap-1 font-medium text-gray-700">หรือระบุเป็นลิงก์ภาพ (Slip URL)<input className="px-3 py-2 border border-gray-200 rounded-xl text-xs" value={form.slipUrl} onChange={(e) => setForm({ ...form, slipUrl: e.target.value })} /></label>
        <div className="sm:col-span-2"><ImagePreviewGrid images={[...(deposit?.attachments || []), ...newSlipImages].filter(Boolean)} /></div>
        <label className="sm:col-span-2 flex flex-col gap-1 font-medium text-gray-700">สถานะขั้นตอนตรวจสอบ<select className="px-3 py-2 border border-gray-200 rounded-xl bg-white" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="waiting">รอฝากเงิน / กำลังเดินทาง</option><option value="submitted">ส่งสลิปหลักฐานแล้ว</option><option value="verified">ตรวจสอบสมบูรณ์ (ล็อกรายการ)</option></select></label>
      </div>
    </ModalFrame>
  );
}

function AccountFormModal({ account, mode = 'create', onClose, onSaved, onCreated, onUpdated }) {
  const readonly = mode === 'view';
  const [form, setForm] = useState({
    bankName: account?.bank || 'กสิกรไทย',
    bankShort: account?.bankShort || 'KBANK',
    accountNo: account?.accNo || '',
    accountName: account?.accName || 'บจก. ครูซี่',
    accountType: account?.type || 'ออมทรัพย์',
    colorCode: account?.color || '#138F2D'
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const result = account ? await salesDashboardService.updateBankAccount(account.id, form) : await salesDashboardService.createBankAccount(form);
      const normalizeBankAccountLocal = (row) => ({
        id: row.id, bank: row.bank_name || row.bank, bankShort: row.bank_short || row.bankShort,
        color: row.color_code || row.color || '#138F2D', accNo: row.account_no || row.accNo,
        accName: row.account_name || row.accName, type: row.account_type || row.type || 'ออมทรัพย์',
        active: row.is_active === undefined ? row.active !== false : row.is_active !== false
      });
      const saved = normalizeBankAccountLocal(result.data);
      if (account) onUpdated(saved);
      else onCreated(saved);
      onSaved(account ? 'แก้ไขบัญชีธนาคารสำเร็จ' : 'เพิ่มบัญชีธนาคารสำเร็จ');
      onClose();
    } catch (error) {
      onSaved(error.message || 'เพิ่มบัญชีไม่สำเร็จ', 'err');
    } finally {
      setSaving(false);
    }
  }

  if (readonly) {
    return (
      <ModalFrame title="รายละเอียดช่องรับเงินระบบ" onClose={onClose} footer={<button className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl" onClick={onClose}>ปิด</button>}>
        <ViewRows rows={[
          ['สถาบันการเงิน', account.bank],
          ['ตัวย่อสากล', account.bankShort],
          ['หมายเลขบัญชี', account.accNo],
          ['ชื่อเจ้าของบัญชี', account.accName],
          ['ประเภทเงินฝาก', account.type],
          ['สถานะเปิดรับเงิน', account.active ? 'เปิดการใช้งานให้พนักงานหน้าร้านกดเลือกได้' : 'ปิดรับชั่วคราว']
        ]} />
      </ModalFrame>
    );
  }

  return (
    <ModalFrame title={account ? '✏️ แก้ไขข้อมูลบัญชีรับเงิน' : '➕ เพิ่มบัญชีรับเงินในระบบหลังบ้าน'} onClose={onClose} footer={<><button className="px-4 py-2 text-sm text-gray-500" onClick={onClose}>ยกเลิก</button><button className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl" onClick={save} disabled={saving}>บันทึกบัญชี</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <label className="flex flex-col gap-1 font-medium text-gray-700">ชื่อธนาคารเต็ม<input className="px-3 py-2 border border-gray-200 rounded-xl" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">รหัสย่อธนาคาร<input className="px-3 py-2 border border-gray-200 rounded-xl" value={form.bankShort} onChange={(e) => setForm({ ...form, bankShort: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">หมายเลขบัญชี<input className="px-3 py-2 border border-gray-200 rounded-xl" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ชื่อผู้ถือบัญชี<input className="px-3 py-2 border border-gray-200 rounded-xl" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ประเภทสมุดบัญชี<input className="px-3 py-2 border border-gray-200 rounded-xl" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} /></label>
        <label className="flex flex-col gap-1 font-medium text-gray-700">ธีมสีสัญลักษณ์ธนาคาร<input className="w-full h-10 border border-gray-200 rounded-xl cursor-pointer p-1" type="color" value={form.colorCode} onChange={(e) => setForm({ ...form, colorCode: e.target.value })} /></label>
      </div>
    </ModalFrame>
  );
}

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================

export default function SaleDashboard({ data, user, currentBranch, from, to }) {
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState(data.sales);
  const [deposits, setDeposits] = useState(data.deposits);
  const [bankAccounts, setBankAccounts] = useState(data.bankAccounts);
  
  const [modalSale, setModalSale] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setSales(data.sales);
    setDeposits(data.deposits);
    setBankAccounts(data.bankAccounts);
  }, [data.sales, data.deposits, data.bankAccounts]);

  const localData = useMemo(() => ({ ...data, sales, deposits, bankAccounts }), [data, sales, deposits, bankAccounts]);
  const visibleSales = useMemo(() => filteredSales(localData, user, currentBranch, from, to), [localData, user, currentBranch, from, to]);
  const visibleDeposits = useMemo(() => filteredDeposits(localData, user, currentBranch, from, to), [localData, user, currentBranch, from, to]);

  function flash(message, type = 'ok') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  }

  async function refreshConsoleData() {
    try {
      const payload = await salesDashboardService.getConsoleData();
      const refreshed = hydrateConsoleData(payload);
      setSales(refreshed.sales);
      setDeposits(refreshed.deposits);
      setBankAccounts(refreshed.bankAccounts);
    } catch (error) {
      flash(error.message || 'ไม่สามารถรีเฟรชข้อมูลจาก DB ได้', 'err');
    }
  }

  async function confirmSale(sale) {
    try {
      await salesDashboardService.updateSale(sale.id, {
        status: 'confirmed', confirmedBy: user.username, confirmedAt: new Date().toISOString(), reason: 'ยืนยันยอดผ่าน Sales Dashboard'
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
        status: 'verified', verifiedBy: user.username, verifiedAt: new Date().toISOString()
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

  // ==========================================
  // TAB DISPLAY 1: DAILY SALES TAB
  // ==========================================
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
                  <th className="p-3">ยืนยัน</th>
                  <th className="p-3 text-right">เครื่องมือ</th>
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
                    <td className="p-3"><StatusBadge status={sale.status} /></td>
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
                  <th className="p-3 text-right">เครื่องมือ</th>
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

  // ==========================================
  // TAB DISPLAY 2: CASH DEPOSITS MANAGEMENT
  // ==========================================
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

  // ==========================================
  // TAB DISPLAY 3: BANK STATEMENT SUMMARY
  // ==========================================
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

  // ==========================================
  // TAB DISPLAY 4: BANK ACCOUNT SETTING
  // ==========================================
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
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
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
      {editor?.type === 'sale' && <SalesEditorModal data={localData} sale={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertSale} onRefresh={refreshConsoleData} />}
      {editor?.type === 'deposit' && <DepositEditorModal data={localData} deposit={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertDeposit} onRefresh={refreshConsoleData} />}
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