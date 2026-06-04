import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Lock, Pencil, Plus, Unlock, X } from 'lucide-react';
import { hydrateConsoleData } from '../lib/hydrate';
import { salesDashboardService } from '../features/salesDashboard/services/salesDashboardService';
import {
  accountById,
  branchById,
  depositStatus,
  employeeById,
  filteredDeposits,
  filteredSales,
  money,
  rawSalesText,
  shortDate,
  statusBadge,
  tabs,
  timeText
} from '../features/salesDashboard/salesDashboardUtils';

function StatCard({ tone = 'green', value, label }) {
  return (
    <div className={`sale-stat sale-stat-${tone}`}>
      <div className="sale-stat-num">{value}</div>
      <div className="sale-stat-label">{label}</div>
    </div>
  );
}

function Badge({ kind, children }) {
  return <span className={`sale-badge ${kind}`}>{children}</span>;
}

function EmployeeChip({ data, employeeId, time }) {
  const employee = employeeById(data, employeeId);
  if (!employee) return <span className="sale-submitter">{employeeId || '—'}{time ? ` · ${timeText(time)}` : ''}</span>;
  return (
    <span className="sale-submitter">
      <span className="sale-emp-dot" style={{ background: employee.color }}>{(employee.nickname || employee.name || '?')[0]}</span>
      {employee.nickname || employee.name}
      {time ? ` · ${timeText(time)}` : ''}
    </span>
  );
}

function BankChip({ data, accountId }) {
  const account = accountById(data, accountId);
  if (!account) return <span className="sale-muted">—</span>;
  return (
    <span className="sale-bank-chip" style={{ background: account.color }}>
      {account.bankShort} *{String(account.accNo || '').slice(-3)}
    </span>
  );
}

function SalesLogModal({ data, sale, onClose }) {
  if (!sale) return null;
  const branch = branchById(data, sale.bid);
  const submittedBy = employeeById(data, sale.submittedBy);
  return (
    <div className="overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <h2>ประวัติเบื้องหลัง LINE - {branch?.code || sale.bid}</h2>
          <button className="m-close" onClick={onClose} aria-label="ปิด"><X size={20} /></button>
        </div>
        <div className="m-body">
          <div className="sale-modal-meta">
            <b>สาขา:</b> {branch?.code || sale.bid} | <b>วันที่:</b> {shortDate(sale.date)}
          </div>
          <div className="sale-log-timeline">
            <div className="sale-log-item submit">
              <span className="time">{timeText(sale.submitTime) || '—'}</span>
              <div className="detail">
                <b>พนักงานส่งยอดจาก LINE Webhook</b>
                <br />
                <span className="sale-muted">โดย {submittedBy?.nickname || submittedBy?.name || sale.submittedBy || '—'}</span>
              </div>
            </div>
            {(sale.editLog || []).map((log) => (
              <div className="sale-log-item edit" key={log.id || `${log.field}_${log.time}`}>
                <span className="time">{timeText(log.time) || '—'}</span>
                <div className="detail">
                  <b>แก้ไขฟิลด์ [{log.field}] ผ่านระบบหลังบ้าน</b>
                  <div className="sale-change">
                    <span className="old">{log.from || '—'}</span>
                    <span>→</span>
                    <span className="new">{log.to || '—'}</span>
                  </div>
                  {log.reason ? <div className="sale-reason">เหตุผล: "{log.reason}"</div> : null}
                </div>
              </div>
            ))}
            {sale.confirmedBy ? (
              <div className="sale-log-item confirm">
                <span className="time">{timeText(sale.confirmTime) || '—'}</span>
                <div className="detail">
                  <b>ยืนยันยอดขายแล้ว</b>
                  <br />
                  <span className="sale-muted">โดย {sale.confirmedBy}</span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="sale-raw-title">ข้อความดิบจาก LINE Chat</div>
          <pre className="sale-raw-text">{rawSalesText(sale)}</pre>
        </div>
        <div className="m-foot">
          <button className="btn btn-primary" onClick={onClose}>ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  );
}

function normalizeBankAccount(row) {
  return {
    id: row.id,
    bank: row.bank_name || row.bank,
    bankShort: row.bank_short || row.bankShort,
    color: row.color_code || row.color || '#138F2D',
    accNo: row.account_no || row.accNo,
    accName: row.account_name || row.accName,
    type: row.account_type || row.type || 'ออมทรัพย์',
    active: row.is_active === undefined ? row.active !== false : row.is_active !== false
  };
}

function normalizeSale(row) {
  return {
    id: String(row.id),
    date: row.sell_date || row.date,
    bid: row.branch_id || row.bid,
    total: Number(row.total_amount ?? row.total ?? 0),
    cash: Number(row.cash_amount ?? row.cash ?? 0),
    transfer: Number(row.transfer_amount ?? row.transfer ?? 0),
    credit: Number(row.credit_amount ?? row.credit ?? 0),
    qr: Number(row.qr_amount ?? row.qr ?? 0),
    submittedBy: row.submitted_by || row.submittedBy || null,
    submitTime: timeText(row.submitted_at || row.submitTime),
    confirmedBy: row.confirmed_by || row.confirmedBy || null,
    confirmTime: timeText(row.confirmed_at || row.confirmTime),
    status: row.status || 'draft',
    rawText: row.raw_text || row.rawText || '',
    editLog: row.editLog || [],
    attachments: row.attachments || []
  };
}

function normalizeDeposit(row) {
  return {
    id: String(row.id),
    date: row.deposit_date || row.date,
    bid: row.branch_id || row.bid,
    expected: Number(row.expected_amount ?? row.expected ?? 0),
    deposited: Number(row.deposited_amount ?? row.deposited ?? 0),
    slip: Boolean(row.slip_url || row.slip),
    bankAccId: row.bank_account_id || row.bankAccId || null,
    depositedBy: row.deposited_by || row.depositedBy || null,
    verifiedBy: row.verified_by || row.verifiedBy || null,
    verifyTime: timeText(row.verified_at || row.verifyTime),
    slipUrl: row.slip_url || row.slipUrl || '',
    attachments: row.attachments || [],
    status: row.status || 'waiting'
  };
}

function normalizeAttachment(row) {
  return {
    id: String(row.id),
    entityType: row.entity_type || row.entityType,
    entityId: String(row.entity_id || row.entityId),
    fileUrl: row.file_url || row.fileUrl,
    createdAt: row.created_at || row.createdAt || null
  };
}

function filesToDataUrls(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

function ModalFrame({ title, onClose, children, footer }) {
  return (
    <div className="overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <h2>{title}</h2>
          <button className="m-close" onClick={onClose} aria-label="ปิด"><X size={20} /></button>
        </div>
        <div className="m-body">{children}</div>
        <div className="m-foot">{footer}</div>
      </div>
    </div>
  );
}

function ViewRows({ rows }) {
  return (
    <div className="sale-account-body sale-view-body">
      {rows.map(([label, value]) => (
        <div key={label}><span>{label}</span><b>{value || '—'}</b></div>
      ))}
    </div>
  );
}

function ImagePreviewGrid({ images = [] }) {
  if (!images.length) return <div className="sale-empty sale-image-empty">ไม่มีรูปแนบ</div>;
  return (
    <div className="sale-image-grid">
      {images.map((image, index) => (
        <a href={image.fileUrl || image} target="_blank" rel="noreferrer" className="sale-image-thumb" key={image.id || index}>
          <img src={image.fileUrl || image} alt={`attachment-${index + 1}`} />
        </a>
      ))}
    </div>
  );
}

function SalesEditorModal({ data, sale, mode, onClose, onSaved, onUpsert, onRefresh }) {
  const readonly = mode === 'view';
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
      const saved = normalizeSale(result.data);
      if (newImages.length) {
        const created = await salesDashboardService.createAttachments(newImages.map((fileUrl) => ({
          entityType: 'sale',
          entityId: saved.id,
          fileUrl
        })));
        saved.attachments = [...(sale?.attachments || []), ...(created.data || []).map(normalizeAttachment)];
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
      <ModalFrame title="ดูรายละเอียดยอดขาย" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>ปิด</button>}>
        <ViewRows rows={[
          ['สาขา', `${branch?.code || sale.bid} ${branch?.name || ''}`],
          ['วันที่', shortDate(sale.date)],
          ['เงินสด', `฿${money(sale.cash)}`],
          ['โอน', `฿${money(sale.transfer)}`],
          ['QR', `฿${money(sale.qr)}`],
          ['เครดิต', `฿${money(sale.credit)}`],
          ['ยอดรวม', `฿${money(sale.total)}`],
          ['สถานะ', sale.status]
        ]} />
        <div className="sale-raw-title">รูปยอดขายรายวัน</div>
        <ImagePreviewGrid images={sale.attachments || []} />
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={sale ? 'แก้ไขยอดขาย' : 'เพิ่มยอดขาย'}
      onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button></>}
    >
      <div className="sale-form-grid">
        <label>วันที่<input className="input" type="date" value={form.sellDate} onChange={(event) => update('sellDate', event.target.value)} /></label>
        <label>สาขา<select className="input" value={form.branchId} onChange={(event) => update('branchId', event.target.value)}>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>)}</select></label>
        <label>เงินสด<input className="input" type="number" value={form.cashAmount} onChange={(event) => update('cashAmount', event.target.value)} /></label>
        <label>โอน<input className="input" type="number" value={form.transferAmount} onChange={(event) => update('transferAmount', event.target.value)} /></label>
        <label>QR<input className="input" type="number" value={form.qrAmount} onChange={(event) => update('qrAmount', event.target.value)} /></label>
        <label>เครดิต<input className="input" type="number" value={form.creditAmount} onChange={(event) => update('creditAmount', event.target.value)} /></label>
        <label>ยอดรวม<input className="input" type="number" value={form.totalAmount} onChange={(event) => update('totalAmount', event.target.value)} /></label>
        <label>ส่งโดย<select className="input" value={form.submittedBy} onChange={(event) => update('submittedBy', event.target.value)}><option value="">-</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nickname || employee.name}</option>)}</select></label>
        <label>เวลาส่ง<input className="input" type="time" value={form.submittedAt} onChange={(event) => update('submittedAt', event.target.value)} /></label>
        <label>สถานะ<select className="input" value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">รอยืนยัน</option><option value="confirmed">ยืนยัน</option><option value="edited">แก้ไข</option></select></label>
        <label className="sale-form-wide">อัพโหลดรูปยอดขายรายวันได้หลายรูป<input className="input" type="file" accept="image/*" multiple onChange={async (event) => setNewImages(await filesToDataUrls(event.target.files))} /></label>
        <div className="sale-form-wide"><ImagePreviewGrid images={[...(sale?.attachments || []), ...newImages]} /></div>
        <label className="sale-form-wide">Raw Text<textarea className="input" rows={4} value={form.rawText} onChange={(event) => update('rawText', event.target.value)} /></label>
      </div>
    </ModalFrame>
  );
}

function DepositEditorModal({ data, deposit, mode, onClose, onSaved, onUpsert, onRefresh }) {
  const readonly = mode === 'view';
  const [form, setForm] = useState({
    depositDate: deposit?.date || new Date().toISOString().slice(0, 10),
    branchId: deposit?.bid || data.branches[0]?.id || '',
    expectedAmount: deposit?.expected || 0,
    depositedAmount: deposit?.deposited || 0,
    bankAccountId: deposit?.bankAccId || '',
    depositedBy: deposit?.depositedBy || '',
    slipUrl: deposit?.slipUrl || deposit?.attachments?.[0]?.fileUrl || '',
    status: deposit?.status || 'waiting'
  });
  const [slipImage, setSlipImage] = useState(deposit?.slipUrl || deposit?.attachments?.[0]?.fileUrl || '');
  const [slipChanged, setSlipChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, slipUrl: slipImage || form.slipUrl || null };
      const result = deposit ? await salesDashboardService.updateCashDeposit(deposit.id, payload) : await salesDashboardService.createCashDeposit(payload);
      const saved = normalizeDeposit(result.data);
      if (slipImage && (slipChanged || !deposit)) {
        const created = await salesDashboardService.createAttachments([{
          entityType: 'cash_deposit',
          entityId: saved.id,
          fileUrl: slipImage
        }]);
        saved.attachments = (created.data || []).map(normalizeAttachment);
        saved.slipUrl = slipImage;
        saved.slip = true;
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
      <ModalFrame title="ดูรายละเอียดการฝากเงินสด" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>ปิด</button>}>
        <ViewRows rows={[
          ['สาขา', `${branch?.code || deposit.bid} ${branch?.name || ''}`],
          ['วันที่', shortDate(deposit.date)],
          ['ยอดต้องฝาก', `฿${money(deposit.expected)}`],
          ['ยอดฝากจริง', `฿${money(deposit.deposited)}`],
          ['บัญชีปลายทาง', account ? `${account.bankShort} ${account.accNo}` : '—'],
          ['คนนำฝาก', employeeById(data, deposit.depositedBy)?.nickname || deposit.depositedBy],
          ['สลิป', deposit.slip ? 'มีสลิป' : '—'],
          ['สถานะ', deposit.status]
        ]} />
        <div className="sale-raw-title">รูปสลิปโอนเงิน</div>
        <ImagePreviewGrid images={(deposit.attachments?.length ? deposit.attachments : [deposit.slipUrl].filter(Boolean))} />
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={deposit ? 'แก้ไขรายการฝากเงินสด' : 'เพิ่มรายการฝากเงินสด'}
      onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button></>}
    >
      <div className="sale-form-grid">
        <label>วันที่<input className="input" type="date" value={form.depositDate} onChange={(event) => setForm({ ...form, depositDate: event.target.value })} /></label>
        <label>สาขา<select className="input" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>)}</select></label>
        <label>ยอดต้องฝาก<input className="input" type="number" value={form.expectedAmount} onChange={(event) => setForm({ ...form, expectedAmount: event.target.value })} /></label>
        <label>ยอดฝากจริง<input className="input" type="number" value={form.depositedAmount} onChange={(event) => setForm({ ...form, depositedAmount: event.target.value })} /></label>
        <label>บัญชีปลายทาง<select className="input" value={form.bankAccountId} onChange={(event) => setForm({ ...form, bankAccountId: event.target.value })}><option value="">-</option>{data.bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankShort} - {account.accNo}</option>)}</select></label>
        <label>คนนำฝาก<select className="input" value={form.depositedBy} onChange={(event) => setForm({ ...form, depositedBy: event.target.value })}><option value="">-</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nickname || employee.name}</option>)}</select></label>
        <label className="sale-form-wide">อัพโหลดสลิปรูปโอนเงิน<input className="input" type="file" accept="image/*" onChange={async (event) => { setSlipImage((await filesToDataUrls(event.target.files))[0] || ''); setSlipChanged(true); }} /></label>
        <label className="sale-form-wide">Slip URL<input className="input" value={slipImage || form.slipUrl} onChange={(event) => { setSlipImage(event.target.value); setSlipChanged(true); setForm({ ...form, slipUrl: event.target.value }); }} /></label>
        <div className="sale-form-wide"><ImagePreviewGrid images={[slipImage || form.slipUrl].filter(Boolean)} /></div>
        <label>สถานะ<select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="waiting">รอฝาก</option><option value="submitted">ส่งสลิปแล้ว</option><option value="verified">ตรวจสอบแล้ว</option></select></label>
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
      const saved = normalizeBankAccount(result.data);
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
      <ModalFrame title="ดูรายละเอียดบัญชีรับเงิน" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>ปิด</button>}>
        <ViewRows rows={[
          ['ธนาคาร', account.bank],
          ['รหัสธนาคาร', account.bankShort],
          ['เลขบัญชี', account.accNo],
          ['ชื่อบัญชี', account.accName],
          ['ประเภท', account.type],
          ['สถานะ', account.active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว']
        ]} />
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={account ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคาร'}
      onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button></>}
    >
        <div className="sale-form-grid">
          <label>ธนาคาร<input className="input" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} /></label>
          <label>รหัสธนาคาร<input className="input" value={form.bankShort} onChange={(event) => setForm({ ...form, bankShort: event.target.value })} /></label>
          <label>เลขบัญชี<input className="input" value={form.accountNo} onChange={(event) => setForm({ ...form, accountNo: event.target.value })} /></label>
          <label>ชื่อบัญชี<input className="input" value={form.accountName} onChange={(event) => setForm({ ...form, accountName: event.target.value })} /></label>
          <label>ประเภทบัญชี<input className="input" value={form.accountType} onChange={(event) => setForm({ ...form, accountType: event.target.value })} /></label>
          <label>สีธนาคาร<input className="input" type="color" value={form.colorCode} onChange={(event) => setForm({ ...form, colorCode: event.target.value })} /></label>
        </div>
    </ModalFrame>
  );
}

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
        status: 'confirmed',
        confirmedBy: user.username,
        confirmedAt: new Date().toISOString(),
        reason: 'ยืนยันยอดผ่าน Sales Dashboard'
      });
      setSales((rows) => rows.map((row) => row.id === sale.id ? { ...row, status: 'confirmed', confirmedBy: user.username, confirmTime: new Date().toISOString() } : row));
      flash('ยืนยันยอดเงินสำเร็จ');
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
      flash('ยืนยันรับเข้าเรียบร้อย');
    } catch (error) {
      flash(error.message || 'ยืนยันสลิปไม่สำเร็จ', 'err');
    }
  }

  async function toggleBankAccount(account) {
    try {
      await salesDashboardService.updateBankAccount(account.id, { isActive: !account.active });
      setBankAccounts((rows) => rows.map((row) => row.id === account.id ? { ...row, active: !row.active } : row));
      flash('เปลี่ยนแปลงสถานะบัญชีธนาคารแล้ว');
    } catch (error) {
      flash(error.message || 'เปลี่ยนสถานะไม่สำเร็จ', 'err');
    }
  }

  function upsertSale(sale, isEdit) {
    setSales((rows) => isEdit ? rows.map((row) => row.id === sale.id ? { ...row, ...sale } : row) : [...rows, sale]);
  }

  function upsertDeposit(deposit, isEdit) {
    setDeposits((rows) => isEdit ? rows.map((row) => row.id === deposit.id ? { ...row, ...deposit } : row) : [...rows, deposit]);
  }

  function updateAccount(account) {
    setBankAccounts((rows) => rows.map((row) => row.id === account.id ? { ...row, ...account } : row));
  }

  const renderStats = () => {
    const totalSales = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCash = visibleSales.reduce((sum, sale) => sum + sale.cash, 0);
    const totalQr = visibleSales.reduce((sum, sale) => sum + sale.qr + sale.transfer, 0);
    const totalCredit = visibleSales.reduce((sum, sale) => sum + sale.credit, 0);
    return (
      <>
        <div className="sale-stats-row">
          <StatCard value={`฿${money(totalSales)}`} label="ยอดขายรวม" />
          <StatCard tone="blue" value={`฿${money(totalCash)}`} label="เงินสดหน้าร้าน" />
          <StatCard tone="purple" value={`฿${money(totalQr)}`} label="QR Code / โอน" />
          <StatCard tone="orange" value={`฿${money(totalCredit)}`} label="บัตรเครดิต" />
        </div>
        <div className="sale-stats-row sale-mini-stats">
          <StatCard tone="orange" value={visibleSales.filter((sale) => sale.status === 'draft').length} label="รอยืนยันยอด" />
          <StatCard tone="blue" value={visibleSales.filter((sale) => sale.status === 'edited' || sale.editLog?.length).length} label="มีประวัติแก้ไข" />
        </div>
      </>
    );
  };

  const renderSalesTab = () => {
    const byBranch = localData.branches
      .map((branch) => ({ branch, rows: visibleSales.filter((sale) => String(sale.bid) === String(branch.id)) }))
      .filter((item) => item.rows.length);

    return (
      <>
        {renderStats()}
        <div className="sale-table-wrap">
          <div className="sale-table-head">
            <h3>{currentBranch === 'all' ? 'สรุปยอดขายแยกตามสาขา' : `ประวัติยอดขายรายวัน: สาขา ${branchById(localData, currentBranch)?.code || currentBranch}`}</h3>
            <button className="btn btn-primary" onClick={() => setEditor({ type: 'sale', mode: 'create' })}><Plus size={14} /> เพิ่มยอดขาย</button>
          </div>
          <div className="sale-table-scroll">
            <table className="sale-table">
              <thead>
                <tr>
                  <th>{currentBranch === 'all' ? 'สาขา' : 'วันที่'}</th>
                  <th>ยอดรวม</th><th>เงินสด</th><th>QR/โอน</th><th>เครดิต</th><th>ส่งโดย</th><th>ยืนยัน</th><th>สถานะ</th><th>เครื่องมือ</th>
                </tr>
              </thead>
              <tbody>
                {currentBranch === 'all' ? byBranch.map(({ branch, rows }) => {
                  const latest = rows.at(-1);
                  const badge = statusBadge(latest.status);
                  return (
                    <tr key={branch.id}>
                      <td className="sale-branch-cell">{branch.code} - {branch.name}</td>
                      <td>฿{money(rows.reduce((sum, row) => sum + row.total, 0))}</td>
                      <td>฿{money(rows.reduce((sum, row) => sum + row.cash, 0))}</td>
                      <td>฿{money(rows.reduce((sum, row) => sum + row.qr + row.transfer, 0))}</td>
                      <td>฿{money(rows.reduce((sum, row) => sum + row.credit, 0))}</td>
                      <td><EmployeeChip data={localData} employeeId={latest.submittedBy} time={latest.submitTime} /></td>
                      <td>{latest.confirmedBy ? <EmployeeChip data={localData} employeeId={latest.confirmedBy} time={latest.confirmTime} /> : <span className="sale-wait">รอตรวจ</span>}</td>
                      <td><Badge kind={badge.className}>{badge.label}</Badge></td>
                      <td className="sale-actions">
                        <button className="sale-action view" onClick={() => setEditor({ type: 'sale', mode: 'view', item: latest })}><Eye size={12} /> ดู</button>
                        <button className="sale-action approve" onClick={() => setEditor({ type: 'sale', mode: 'edit', item: latest })}><Pencil size={12} /> แก้ไข</button>
                        <button className="sale-action view" onClick={() => setModalSale(latest)}><Eye size={12} /> Log</button>
                      </td>
                    </tr>
                  );
                }) : visibleSales.map((sale) => {
                  const badge = statusBadge(sale.status);
                  return (
                    <tr key={sale.id}>
                      <td className="sale-branch-cell">{shortDate(sale.date)}</td>
                      <td>฿{money(sale.total)}</td>
                      <td>฿{money(sale.cash)}</td>
                      <td>฿{money(sale.qr + sale.transfer)}</td>
                      <td>฿{money(sale.credit)}</td>
                      <td><EmployeeChip data={localData} employeeId={sale.submittedBy} time={sale.submitTime} /></td>
                      <td>{sale.confirmedBy ? <span className="sale-submitter">{sale.confirmedBy} · {timeText(sale.confirmTime)}</span> : <span className="sale-wait">รอตรวจ</span>}</td>
                      <td><Badge kind={badge.className}>{badge.label}</Badge></td>
                      <td className="sale-actions">
                        <button className="sale-action view" onClick={() => setEditor({ type: 'sale', mode: 'view', item: sale })}><Eye size={12} /> ดู</button>
                        <button className="sale-action approve" onClick={() => setEditor({ type: 'sale', mode: 'edit', item: sale })}><Pencil size={12} /> แก้ไข</button>
                        <button className="sale-action view" onClick={() => setModalSale(sale)}><Eye size={12} /> ดู Log LINE</button>
                        {sale.status === 'draft' ? <button className="sale-action approve" onClick={() => confirmSale(sale)}><Check size={12} /> ยืนยันยอด</button> : null}
                      </td>
                    </tr>
                  );
                })}
                {!visibleSales.length ? <tr><td colSpan="9" className="sale-empty">ไม่พบข้อมูลยอดขายในช่วงวันที่นี้</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderDepositTab = () => {
    const done = visibleDeposits.filter((deposit) => Number(deposit.deposited) > 0).length;
    const mismatch = visibleDeposits.filter((deposit) => Number(deposit.deposited) && Number(deposit.deposited) !== Number(deposit.expected)).length;
    return (
      <>
        <div className="sale-stats-row">
          <StatCard tone="teal" value={`${done}/${visibleDeposits.length}`} label="ส่งฝากสลิปแล้ว" />
          <StatCard tone={mismatch ? 'red' : 'green'} value={mismatch} label="ยอดไม่ตรงสลิป" />
          <StatCard value={`฿${money(visibleDeposits.reduce((sum, item) => sum + item.expected, 0))}`} label="ยอดเงินสดที่ต้องนำฝาก" />
        </div>
        <div className="sale-table-wrap">
          <div className="sale-table-head">
            <h3>รายการนำฝากเงินสดหน้าร้าน</h3>
            <button className="btn btn-primary" onClick={() => setEditor({ type: 'deposit', mode: 'create' })}><Plus size={14} /> เพิ่มฝากเงินสด</button>
          </div>
          <div className="sale-table-scroll">
            <table className="sale-table">
              <thead><tr><th>สาขา</th><th>วันที่</th><th>เงินสดหน้าร้าน</th><th>ยอดเงินฝากจริง</th><th>บัญชีปลายทาง</th><th>คนนำฝาก</th><th>สลิป</th><th>สถานะตรวจ</th><th>ระบบตรวจสอบ</th></tr></thead>
              <tbody>
                {visibleDeposits.map((deposit) => {
                  const branch = branchById(localData, deposit.bid);
                  const status = depositStatus(deposit);
                  return (
                    <tr key={deposit.id}>
                      <td className="sale-branch-cell">{branch?.code || deposit.bid}</td>
                      <td>{shortDate(deposit.date)}</td>
                      <td>฿{money(deposit.expected)}</td>
                      <td>{deposit.deposited ? `฿${money(deposit.deposited)}` : '—'}</td>
                      <td><BankChip data={localData} accountId={deposit.bankAccId} /></td>
                      <td><EmployeeChip data={localData} employeeId={deposit.depositedBy} /></td>
                      <td>{deposit.slip ? 'รูปสลิป' : '—'}</td>
                      <td><Badge kind={status.className}>{status.label}</Badge></td>
                      <td className="sale-actions">
                        <button className="sale-action view" onClick={() => setEditor({ type: 'deposit', mode: 'view', item: deposit })}><Eye size={12} /> ดู</button>
                        <button className="sale-action approve" onClick={() => setEditor({ type: 'deposit', mode: 'edit', item: deposit })}><Pencil size={12} /> แก้ไข</button>
                        {deposit.verifiedBy ? <span className="sale-verified">ตรวจสอบแล้ว</span> : deposit.deposited ? <button className="sale-action approve" onClick={() => verifyDeposit(deposit)}><Check size={12} /> ยืนยันรับเข้า</button> : null}
                      </td>
                    </tr>
                  );
                })}
                {!visibleDeposits.length ? <tr><td colSpan="9" className="sale-empty">ไม่พบข้อมูลการฝากเงิน</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderAccountTab = () => {
    const activeAccounts = bankAccounts.filter((account) => account.active);
    return (
      <>
        <div className="sale-account-grid">
          {activeAccounts.map((account) => {
            const accountDeposits = deposits.filter((deposit) => String(deposit.bankAccId) === String(account.id) && visibleDeposits.some((item) => item.id === deposit.id));
            const sum = accountDeposits.reduce((total, deposit) => total + deposit.deposited, 0);
            return (
              <div key={account.id} className="sale-account-card" style={{ borderLeftColor: account.color }}>
                <div className="sale-account-head"><div><BankChip data={localData} accountId={account.id} /> <b>{account.bank}</b></div><div className="sale-account-total">฿{money(sum)}</div></div>
                <div className="sale-account-body">
                  <div><span>เลขที่บัญชี</span><b>{account.accNo}</b></div>
                  <div><span>ชื่อบัญชี</span><b>{account.accName}</b></div>
                  <div><span>จำนวนสลิปเข้า</span><b>{accountDeposits.length} รายการ</b></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sale-table-wrap">
          <div className="sale-table-head"><h3>ตารางเงินเข้าบัญชีรายวันรวม</h3></div>
          <div className="sale-table-scroll">
            <table className="sale-table">
              <thead><tr><th>วันที่นำฝาก</th>{activeAccounts.map((account) => <th key={account.id}>{account.bankShort}</th>)}<th>ยอดรวมวัน</th></tr></thead>
              <tbody>
                {[...new Set(visibleDeposits.filter((deposit) => deposit.deposited).map((deposit) => deposit.date))].sort().map((date) => {
                  const dayDeposits = visibleDeposits.filter((deposit) => deposit.date === date);
                  return (
                    <tr key={date}>
                      <td className="sale-branch-cell">{shortDate(date)}</td>
                      {activeAccounts.map((account) => {
                        const amount = dayDeposits.filter((deposit) => String(deposit.bankAccId) === String(account.id)).reduce((sum, deposit) => sum + deposit.deposited, 0);
                        return <td key={account.id}>{amount ? `฿${money(amount)}` : '—'}</td>;
                      })}
                      <td className="sale-total-cell">฿{money(dayDeposits.reduce((sum, deposit) => sum + deposit.deposited, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderManageTab = () => (
    <>
      <div className="sale-manage-head">
        <h3>บัญชีธนาคารรับเงินทั้งหมดในระบบ</h3>
        <button className="btn btn-primary" onClick={() => setShowAccountForm(true)}><Plus size={14} /> เพิ่มบัญชีรับเงิน</button>
      </div>
      <div className="sale-account-grid">
        {bankAccounts.map((account) => (
          <div key={account.id} className={`sale-account-card ${account.active ? '' : 'disabled'}`} style={{ borderLeftColor: account.active ? account.color : '#ccc' }}>
            <div className="sale-account-head">
              <b>{account.bank} ({account.bankShort})</b>
              <button className={`sale-action ${account.active ? 'reject' : 'approve'}`} onClick={() => toggleBankAccount(account)}>
                {account.active ? <Lock size={12} /> : <Unlock size={12} />} {account.active ? 'ปิด' : 'เปิด'}
              </button>
            </div>
            <div className="sale-account-body">
              <div><span>เลขบัญชี</span><b>{account.accNo}</b></div>
              <div><span>ชื่อบัญชี</span><b>{account.accName}</b></div>
              <div><span>สถานะรับสลิป</span><b>{account.active ? 'เปิดใช้งานให้หน้าร้านเลือก' : 'ปิดชั่วคราว'}</b></div>
              <div className="sale-row-actions">
                <span>เครื่องมือ</span>
                <b>
                  <button className="sale-action view" onClick={() => setEditor({ type: 'account', mode: 'view', item: account })}><Eye size={12} /> ดู</button>
                  <button className="sale-action approve" onClick={() => setEditor({ type: 'account', mode: 'edit', item: account })}><Pencil size={12} /> แก้ไข</button>
                </b>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="sale-dashboard">
      <div className="sub-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="content sale-content">
        {activeTab === 'sales' ? renderSalesTab() : null}
        {activeTab === 'deposit' ? renderDepositTab() : null}
        {activeTab === 'account' ? renderAccountTab() : null}
        {activeTab === 'manage' ? renderManageTab() : null}
      </div>
      <SalesLogModal data={localData} sale={modalSale} onClose={() => setModalSale(null)} />
      {showAccountForm ? <AccountFormModal onClose={() => setShowAccountForm(false)} onSaved={flash} onCreated={(account) => setBankAccounts((rows) => [...rows, account])} onUpdated={updateAccount} /> : null}
      {editor?.type === 'sale' ? <SalesEditorModal data={localData} sale={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertSale} onRefresh={refreshConsoleData} /> : null}
      {editor?.type === 'deposit' ? <DepositEditorModal data={localData} deposit={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onUpsert={upsertDeposit} onRefresh={refreshConsoleData} /> : null}
      {editor?.type === 'account' ? <AccountFormModal account={editor.item} mode={editor.mode} onClose={() => setEditor(null)} onSaved={flash} onCreated={(account) => setBankAccounts((rows) => [...rows, account])} onUpdated={updateAccount} /> : null}
      {toast ? <div className="toasts"><div className={`t ${toast.type === 'err' ? 't-err' : 't-ok'}`}>{toast.message}</div></div> : null}
    </div>
  );
}
