import { useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { thaiShortDate, formatDbTime } from '../lib/date.js';
import { useAlerts } from '../features/alerts/hooks/useAlerts.js';

const TYPE_CONFIG = {
  absent: { label: 'ขาดงาน', color: 'bg-red-50 text-red-700', badge: 'bg-red-100 text-red-800', icon: 'ขาด' },
  late: { label: 'มาสาย', color: 'bg-orange-50 text-orange-700', badge: 'bg-orange-100 text-orange-800', icon: 'สาย' },
  store_open_late: { label: 'เปิดร้านสาย', color: 'bg-orange-50 text-orange-700', badge: 'bg-orange-100 text-orange-800', icon: 'เปิด' },
  break_over: { label: 'พักเกิน', color: 'bg-amber-50 text-amber-700', badge: 'bg-amber-100 text-amber-800', icon: 'พัก' },
  early: { label: 'ปิดก่อนเวลา', color: 'bg-yellow-50 text-yellow-700', badge: 'bg-yellow-100 text-yellow-800', icon: 'ปิด' },
  store_close_early: { label: 'ปิดร้านก่อนเวลา', color: 'bg-yellow-50 text-yellow-700', badge: 'bg-yellow-100 text-yellow-800', icon: 'ปิด' },
  nocheck: { label: 'ไม่ Check-out', color: 'bg-blue-50 text-blue-700', badge: 'bg-blue-100 text-blue-800', icon: 'ไม่มี' }
};

const SEVERITY_CONFIG = {
  critical: { label: 'วิกฤต', className: 'bg-red-100 text-red-800' },
  warning: { label: 'แจ้งเตือน', className: 'bg-orange-100 text-orange-800' }
};

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 caption body-strong ${className}`}>{children}</span>;
}

function AlertCard({ alert, employee, branch, isOpen, onToggle, onAck, onEdit, onDelete, acking }) {
  const config = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.late;
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
  const isDerived = alert.source === 'discipline' || alert.source === 'store';
  const acknowledged = Boolean(alert.is_acknowledged);
  const sourceLabel = alert.source === 'store' ? 'จากข้อมูลเปิด/ปิดร้าน' : 'จากข้อมูลวินัยจริง';

  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer section-card-lg transition hover:shadow-md ${
        acknowledged ? 'border-emerald-200 bg-emerald-50/35' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl border caption body-strong ${config.badge}`}>{config.icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 body-strong text-slate-900">
              <span>{alert.title}</span>
              <Badge className={severity.className}>{severity.label}</Badge>
              {isDerived ? <Badge className="bg-emerald-100 text-emerald-800">{sourceLabel}</Badge> : null}
            </div>
            <div className="mt-1 body-text text-slate-500">{employee?.name || alert.employee_id} · {branch?.code || alert.branch_id} · {thaiShortDate(alert.work_date)}</div>
            <div className="mt-2 body-text text-slate-700">{alert.detail || '-'}</div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Badge className={config.badge}>{config.label}</Badge>
            <Badge className={acknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
              {acknowledged ? (
                <>
                  <CheckCircle2 size={12} /> รับทราบแล้ว
                </>
              ) : 'ยังไม่รับทราบ'}
            </Badge>
          </div>
          <div className="text-right caption text-slate-500">{formatDbTime(alert.alert_time) || 'ไม่ระบุเวลา'}</div>
          <div className="flex gap-2 pt-2">
            {!acknowledged ? (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onAck(alert); }}
                disabled={acking}
                className="btn btn-success btn-sm disabled:cursor-wait disabled:opacity-60"
              >
                {acking ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {acking ? 'กำลังบันทึก...' : 'รับทราบ'}
              </button>
            ) : (
              <button type="button" disabled className="btn btn-primary btn-sm">
                <CheckCircle2 size={14} /> รับทราบแล้ว
              </button>
            )}
            {!isDerived ? (
              <>
                <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(alert); }} className="btn btn-secondary btn-sm">
                  แก้ไข
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(alert); }} className="btn btn-danger btn-sm">
                  <Trash2 size={14} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className={`border-t border-slate-100 px-4 py-3 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="section-card-soft body-text text-slate-700">
            <div className="caption text-slate-500">สาขา</div>
            <div className="mt-2 body-strong text-slate-900">{branch?.name || '-'}</div>
          </div>
          <div className="section-card-soft body-text text-slate-700">
            <div className="caption text-slate-500">พนักงาน</div>
            <div className="mt-2 body-strong text-slate-900">{employee?.name || '-'}</div>
          </div>
          <div className="section-card-soft body-text text-slate-700">
            <div className="caption text-slate-500">ประเภท</div>
            <div className="mt-2 body-strong text-slate-900">{config.label}</div>
          </div>
          <div className="section-card-soft body-text text-slate-700">
            <div className="caption text-slate-500">แหล่งข้อมูล</div>
            <div className="mt-2 body-strong text-slate-900">{alert.source === 'store' ? 'คำนวณจากข้อมูลเปิด/ปิดร้าน' : isDerived ? 'คำนวณจากวินัย/เข้างาน' : 'บันทึกในระบบแจ้งเตือน'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertSection({ title, subtitle, alerts, children }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="body-strong text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 caption text-slate-500">{subtitle}</p> : null}
        </div>
        <span className="count-pill">{alerts.length} รายการ</span>
      </div>
      {children}
    </section>
  );
}

function toMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function diffAfter(value, target) {
  const valueMinutes = toMinutes(value);
  const targetMinutes = toMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, valueMinutes - targetMinutes);
}

function diffBefore(value, target) {
  const valueMinutes = toMinutes(value);
  const targetMinutes = toMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, targetMinutes - valueMinutes);
}

function diffBetween(start, end, fallback = 0) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null) return Number(fallback || 0);
  return Math.max(0, endMinutes - startMinutes);
}

function employeeBreakMinutes(employee) {
  const raw = Number(employee?.breakHours ?? 1);
  if (!Number.isFinite(raw)) return 60;
  return Math.round(raw * 60);
}

function branchShiftStart(branch, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const key = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' }[day];
  return branch?.hours?.[key] || '10:00';
}

function branchShiftEnd(branch, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const key = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' }[day];
  return branch?.hoursEnd?.[key] || '21:00';
}

export function buildDisciplineAlerts(data, dismissedIds = new Set()) {
  const employees = data?.employees || [];
  const branches = data?.branches || [];
  const attendanceRows = data?.attendance || [];
  const schedule = data?.schedule || {};
  const today = new Date().toISOString().slice(0, 10);
  const alerts = [];

  Object.entries(schedule).forEach(([key, employeeIds]) => {
    const date = key.slice(-10);
    const branchId = key.slice(0, -11);
    if (!date || date > today) return;
    (employeeIds || []).forEach((employeeId) => {
      const hasAttendance = attendanceRows.some((row) => (
        String(row.empId) === String(employeeId) &&
        String(row.branch) === String(branchId) &&
        row.date === date
      ));
      if (hasAttendance) return;
      const id = `discipline_absent_${employeeId}_${branchId}_${date}`;
      if (dismissedIds.has(id)) return;
      const employee = employees.find((item) => String(item.id) === String(employeeId));
      const branch = branches.find((item) => String(item.id) === String(branchId));
      alerts.push({
        id,
        source: 'discipline',
        alert_type: 'absent',
        employee_id: String(employeeId),
        branch_id: branchId,
        work_date: date,
        alert_time: branchShiftStart(branch, date),
        title: `${employee?.name || employeeId} ขาดงาน`,
        detail: `มีตารางงานที่ ${branch?.code || branchId} แต่ไม่พบข้อมูลเข้างานในวันนั้น`,
        severity: 'critical',
        is_acknowledged: false
      });
    });
  });

  attendanceRows.forEach((row) => {
    const employee = employees.find((item) => String(item.id) === String(row.empId));
    const branch = branches.find((item) => String(item.id) === String(row.branch));
    const shiftStart = branchShiftStart(branch, row.date);
    const shiftEnd = branchShiftEnd(branch, row.date);
    const lateMinutes = Math.max(Number(row.lateMin || 0), diffAfter(row.clockIn, shiftStart));
    if (lateMinutes > 0) {
      const id = `discipline_late_${row.id || `${row.empId}_${row.branch}_${row.date}`}`;
      if (!dismissedIds.has(id)) {
        alerts.push({
          id,
          source: 'discipline',
          alert_type: 'late',
          employee_id: String(row.empId),
          branch_id: row.branch,
          work_date: row.date,
          alert_time: row.clockIn || shiftStart,
          title: `${employee?.name || row.empId} มาสาย ${lateMinutes} นาที`,
          detail: `เวลาเข้างาน ${row.clockIn || '-'} เทียบเวลาเริ่มกะ ${shiftStart} ที่ ${branch?.code || row.branch}`,
          severity: lateMinutes >= 30 ? 'critical' : 'warning',
          is_acknowledged: false
        });
      }
    }

    const earlyMinutes = diffBefore(row.clockOut, shiftEnd);
    if (earlyMinutes > 0) {
      const id = `discipline_early_${row.id || `${row.empId}_${row.branch}_${row.date}`}`;
      if (!dismissedIds.has(id)) {
        alerts.push({
          id,
          source: 'discipline',
          alert_type: 'early',
          employee_id: String(row.empId),
          branch_id: row.branch,
          work_date: row.date,
          alert_time: row.clockOut || shiftEnd,
          title: `${employee?.name || row.empId} ปิดก่อนเวลา ${earlyMinutes} นาที`,
          detail: `เวลาออกงาน ${row.clockOut || '-'} เทียบเวลาเลิกกะ ${shiftEnd} ที่ ${branch?.code || row.branch}`,
          severity: earlyMinutes >= 30 ? 'critical' : 'warning',
          is_acknowledged: false
        });
      }
    }

    const breakMinutes = diffBetween(row.breakStart, row.breakEnd, row.breakMinutes);
    const allowedBreak = employeeBreakMinutes(employee);
    const overMinutes = Math.max(0, breakMinutes - allowedBreak);
    if (overMinutes > 0 || row.breakOver) {
      const id = `discipline_break_${row.id || `${row.empId}_${row.branch}_${row.date}`}`;
      if (!dismissedIds.has(id)) {
        alerts.push({
          id,
          source: 'discipline',
          alert_type: 'break_over',
          employee_id: String(row.empId),
          branch_id: row.branch,
          work_date: row.date,
          alert_time: row.breakEnd || row.breakStart || '',
          title: `${employee?.name || row.empId} พักเกิน ${overMinutes} นาที`,
          detail: `พักจริง ${breakMinutes} นาที เกณฑ์มาตรฐาน ${allowedBreak} นาที (${row.breakStart || '-'} - ${row.breakEnd || '-'})`,
          severity: overMinutes >= 30 ? 'critical' : 'warning',
          is_acknowledged: false
        });
      }
    }
  });

  return alerts.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)) || String(b.alert_time || '').localeCompare(String(a.alert_time || '')));
}

export function buildStoreInspectionAlerts(data, dismissedIds = new Set()) {
  const branches = data?.branches || [];
  const employees = data?.employees || [];
  const inspections = data?.inspections || [];
  const alerts = [];

  inspections.forEach((inspection) => {
    const branch = branches.find((item) => String(item.id) === String(inspection.bid));
    const employee = employees.find((item) => String(item.id) === String(inspection.submittedBy));
    const openTarget = branchShiftStart(branch, inspection.date);
    const closeTarget = branchShiftEnd(branch, inspection.date);
    const lateMinutes = Math.max(Number(inspection.lateMinutes || 0), diffAfter(inspection.submitTime, openTarget));
    const submittedBy = inspection.submittedBy ? String(inspection.submittedBy) : '';

    if (lateMinutes > 0) {
      const id = `store_open_late_${inspection.id}`;
      if (!dismissedIds.has(id)) {
        alerts.push({
          id,
          source: 'store',
          alert_type: 'store_open_late',
          employee_id: submittedBy,
          branch_id: inspection.bid,
          work_date: inspection.date,
          alert_time: inspection.submitTime || openTarget,
          title: `${branch?.code || inspection.bid} เปิดร้านสาย ${lateMinutes} นาที`,
          detail: `บันทึกเปิดร้านเวลา ${inspection.submitTime || '-'} เทียบเวลาเปิดร้าน ${openTarget}${employee ? ` โดย ${employee.name}` : ''}`,
          severity: lateMinutes >= 30 ? 'critical' : 'warning',
          is_acknowledged: false
        });
      }
    }

    const earlyMinutes = inspection.closeTime ? diffBefore(inspection.closeTime, closeTarget) : 0;
    if (earlyMinutes > 0) {
      const id = `store_close_early_${inspection.id}`;
      if (!dismissedIds.has(id)) {
        alerts.push({
          id,
          source: 'store',
          alert_type: 'store_close_early',
          employee_id: submittedBy,
          branch_id: inspection.bid,
          work_date: inspection.date,
          alert_time: inspection.closeTime || closeTarget,
          title: `${branch?.code || inspection.bid} ปิดร้านก่อนเวลา ${earlyMinutes} นาที`,
          detail: `บันทึกปิดร้านเวลา ${inspection.closeTime || '-'} เทียบเวลาปิดร้าน ${closeTarget}${employee ? ` โดย ${employee.name}` : ''}`,
          severity: earlyMinutes >= 30 ? 'critical' : 'warning',
          is_acknowledged: false
        });
      }
    }
  });

  return alerts.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)) || String(b.alert_time || '').localeCompare(String(a.alert_time || '')));
}

function normalizePersistedAlert(alert) {
  const type = alert.alert_type || alert.type;
  return {
    ...alert,
    id: String(alert.id),
    source: 'stored',
    alert_type: type === 'break' ? 'break_over' : type,
    employee_id: String(alert.employee_id ?? alert.empId ?? ''),
    branch_id: alert.branch_id ?? alert.branch,
    work_date: alert.work_date ?? alert.date,
    alert_time: alert.alert_time ?? alert.time,
    is_acknowledged: alert.is_acknowledged ?? alert.ack ?? false
  };
}

function alertIdentityKey(alert) {
  const type = alert.alert_type === 'break' ? 'break_over' : alert.alert_type;
  return [
    type || '',
    String(alert.employee_id ?? alert.empId ?? ''),
    String(alert.branch_id ?? alert.branch ?? ''),
    String(alert.work_date ?? alert.date ?? '')
  ].join('|');
}

function EditAlertModal({ open, onClose, onSave, employees, branches, initialData, saving }) {
  const [form, setForm] = useState(() => ({
    alert_type: initialData?.alert_type || 'late',
    employee_id: initialData?.employee_id || '',
    branch_id: initialData?.branch_id || '',
    work_date: initialData?.work_date || new Date().toISOString().slice(0, 10),
    alert_time: initialData?.alert_time || '',
    title: initialData?.title || '',
    detail: initialData?.detail || '',
    severity: initialData?.severity || 'warning',
    is_acknowledged: initialData?.is_acknowledged || false
  }));

  if (!open) return null;

  const employeeOptions = employees.map((employee) => ({ value: employee.id, label: `${employee.name} (${employee.id})` }));
  const branchOptions = branches.map((branch) => ({ value: branch.id, label: `${branch.code} - ${branch.name}` }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 p-4 pt-20">
      <div className="surface-modal max-w-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="heading-3 text-slate-900">{initialData ? 'แก้ไขแจ้งเตือน' : 'สร้างแจ้งเตือนใหม่'}</h2>
            <p className="mt-1 body-text text-slate-500">เชื่อมข้อมูลกับ backend โดยตรง</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 body-text">
            <span>ผู้แจ้งเตือน</span>
            <select value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))} className="input w-full">
              <option value="">เลือกพนักงาน</option>
              {employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 body-text">
            <span>สาขา</span>
            <select value={form.branch_id} onChange={(event) => setForm((prev) => ({ ...prev, branch_id: Number(event.target.value) }))} className="input w-full">
              <option value="">เลือกสาขา</option>
              {branchOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 body-text">
            <span>ประเภทแจ้งเตือน</span>
            <select value={form.alert_type} onChange={(event) => setForm((prev) => ({ ...prev, alert_type: event.target.value }))} className="input w-full">
              {Object.entries(TYPE_CONFIG).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 body-text">
            <span>ความร้ายแรง</span>
            <select value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))} className="input w-full">
              {Object.entries(SEVERITY_CONFIG).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 body-text">
            <span>วันที่</span>
            <input type="date" value={form.work_date} onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))} className="input w-full" />
          </label>
          <label className="space-y-2 body-text">
            <span>เวลา</span>
            <input type="time" value={form.alert_time} onChange={(event) => setForm((prev) => ({ ...prev, alert_time: event.target.value }))} className="input w-full" />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="space-y-2 body-text">
            <span>หัวข้อ</span>
            <input type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="input w-full" />
          </label>
          <label className="space-y-2 body-text">
            <span>รายละเอียด</span>
            <textarea rows="4" value={form.detail} onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))} className="input w-full resize-none" />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">ยกเลิก</button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="btn btn-primary btn-lg disabled:opacity-60">บันทึก</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertPage({ data, currentBranch }) {
  const { alerts, loading, saving, error, createAlert, updateAlert, acknowledgeAlert, deleteAlert } = useAlerts(data?.attendanceAlerts || []);
  const [tab, setTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dismissedDerivedIds, setDismissedDerivedIds] = useState(() => new Set());
  const [acknowledgedDerivedIds, setAcknowledgedDerivedIds] = useState(() => new Set());
  const [ackingId, setAckingId] = useState(null);
  const [justAcknowledgedIds, setJustAcknowledgedIds] = useState(() => new Set());

  const employees = data?.employees ?? [];
  const branches = data?.branches ?? [];

  const displayAlerts = useMemo(() => {
    const persisted = (alerts?.length ? alerts : data?.attendanceAlerts || []).map(normalizePersistedAlert);
    const persistedKeys = new Set(persisted.map(alertIdentityKey));
    const derived = [
      ...buildDisciplineAlerts(data, dismissedDerivedIds),
      ...buildStoreInspectionAlerts(data, dismissedDerivedIds)
    ].map((alert) =>
      acknowledgedDerivedIds.has(alert.id) ? { ...alert, is_acknowledged: true } : alert,
    ).filter((alert) => !persistedKeys.has(alertIdentityKey(alert)));
    return [...derived, ...persisted];
  }, [alerts, data, dismissedDerivedIds, acknowledgedDerivedIds]);

  const filteredAlerts = useMemo(() => {
    return displayAlerts
      .filter((alert) => currentBranch === 'all' || String(alert.branch_id) === String(currentBranch))
      .filter((alert) => {
        if (tab === 'unack') return !alert.is_acknowledged || justAcknowledgedIds.has(alert.id);
        if (tab === 'ack') return alert.is_acknowledged;
        if (tab === 'all') return true;
        return alert.alert_type === tab;
      })
      .filter((alert) => {
        const value = searchTerm.trim().toLowerCase();
        if (!value) return true;
        return [alert.title, alert.detail, alert.alert_type, alert.severity].some((field) => String(field || '').toLowerCase().includes(value))
          || String(employees.find((employee) => String(employee.id) === String(alert.employee_id))?.name || '').toLowerCase().includes(value)
          || String(branches.find((branch) => String(branch.id) === String(alert.branch_id))?.code || '').toLowerCase().includes(value);
      });
  }, [displayAlerts, currentBranch, tab, searchTerm, employees, branches, justAcknowledgedIds]);

  const stats = useMemo(() => ({
    total: displayAlerts.length,
    absent: displayAlerts.filter((alert) => alert.alert_type === 'absent').length,
    late: displayAlerts.filter((alert) => ['late', 'store_open_late'].includes(alert.alert_type)).length,
    early: displayAlerts.filter((alert) => ['early', 'store_close_early'].includes(alert.alert_type)).length,
    breakOver: displayAlerts.filter((alert) => alert.alert_type === 'break_over').length,
    unack: displayAlerts.filter((alert) => !alert.is_acknowledged).length,
    ack: displayAlerts.filter((alert) => alert.is_acknowledged).length,
    critical: displayAlerts.filter((alert) => alert.severity === 'critical').length
  }), [displayAlerts]);

  const groupedAlerts = useMemo(() => ({
    unacknowledged: filteredAlerts.filter((alert) => !alert.is_acknowledged || justAcknowledgedIds.has(alert.id)),
    acknowledged: filteredAlerts.filter((alert) => alert.is_acknowledged && !justAcknowledgedIds.has(alert.id))
  }), [filteredAlerts, justAcknowledgedIds]);

  const handleSave = async (formData) => {
    const payload = {
      alertType: formData.alert_type,
      employeeId: formData.employee_id,
      branchId: Number(formData.branch_id),
      workDate: formData.work_date,
      alertTime: formData.alert_time,
      title: formData.title,
      detail: formData.detail,
      severity: formData.severity
    };
    if (editingAlert) {
      await updateAlert(editingAlert.id, payload);
    } else {
      await createAlert(payload);
    }
    setEditorOpen(false);
    setEditingAlert(null);
  };

  const openEditor = (alert = null) => {
    setEditingAlert(alert);
    setEditorOpen(true);
  };

  const markJustAcknowledged = (id) => {
    setJustAcknowledgedIds((current) => new Set([...current, id]));
    window.setTimeout(() => {
      setJustAcknowledgedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  const handleAcknowledge = async (alert) => {
    setAckingId(alert.id);
    try {
      if (alert.source === 'discipline' || alert.source === 'store') {
        if (alert.employee_id) {
          await createAlert({
            alertType: alert.alert_type,
            employeeId: alert.employee_id,
            branchId: Number(alert.branch_id),
            workDate: alert.work_date,
            alertTime: alert.alert_time,
            title: alert.title,
            detail: alert.detail,
            severity: alert.severity,
            isAcknowledged: true
          });
        }
        setAcknowledgedDerivedIds((current) => new Set([...current, alert.id]));
        markJustAcknowledged(alert.id);
        window.setTimeout(() => {
          setDismissedDerivedIds((current) => new Set([...current, alert.id]));
          setAcknowledgedDerivedIds((current) => {
            const next = new Set(current);
            next.delete(alert.id);
            return next;
          });
        }, 2500);
        return;
      }
      await acknowledgeAlert(alert.id);
      markJustAcknowledged(alert.id);
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="app-page page-body space-y-3">
      <div className="page-header mb-0 flex-col items-start gap-3 md:flex-row md:items-center">
        <div className="page-heading">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-100">
            <AlertTriangle size={18} />
          </div>
          <div className="page-heading-text">
            <div className="text-[18px] font-medium leading-6 text-slate-900">แจ้งเตือนวินัย</div>
            <div className="caption text-slate-500">สรุปจากข้อมูลเข้างานจริง</div>
          </div>
        </div>
        <button type="button" onClick={() => openEditor(null)} className="btn btn-primary btn-sm">
          <Plus size={16} /> สร้างแจ้งเตือน
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
        <div className="flex gap-2 px-1 sm:grid sm:px-0 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">ทั้งหมด</div>
          <div className="mt-2 stat-number text-slate-900">{stats.total}</div>
        </div>
        <div className="surface-danger min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-red-700">ขาดงาน</div>
          <div className="mt-2 stat-number text-red-800">{stats.absent}</div>
        </div>
        <div className="surface-warning min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-orange-700">มาสาย</div>
          <div className="mt-2 stat-number text-orange-800">{stats.late}</div>
        </div>
        <div className="surface-warning min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-amber-700">พักเกิน</div>
          <div className="mt-2 stat-number text-amber-800">{stats.breakOver}</div>
        </div>
        <div className="surface-warning min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-yellow-700">ปิดก่อนเวลา</div>
          <div className="mt-2 stat-number text-yellow-800">{stats.early}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">ยังไม่รับทราบ</div>
          <div className="mt-2 stat-number text-orange-700">{stats.unack}</div>
        </div>
        <div className="surface-success min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-emerald-700">รับทราบแล้ว</div>
          <div className="mt-2 stat-number text-emerald-800">{stats.ack}</div>
        </div>
        </div>
      </div>

      <div className="section-card-scroll p-1.5">
        <div className="page-tabs border-0">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'unack', label: 'ยังไม่รับทราบ' },
            { id: 'ack', label: 'รับทราบแล้ว' },
            { id: 'absent', label: 'ขาดงาน' },
            { id: 'late', label: 'มาสาย' },
            { id: 'store_open_late', label: 'เปิดร้านสาย' },
            { id: 'break_over', label: 'พักเกิน' },
            { id: 'early', label: 'ปิดก่อนเวลา' },
            { id: 'store_close_early', label: 'ปิดร้านก่อนเวลา' }
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`page-tab ${tab === item.id ? 'active' : ''}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="count-pill body-text">สาขา: {currentBranch === 'all' ? 'ทั้งหมด' : branches.find((branch) => branch.id === currentBranch)?.code || currentBranch}</span>
        </div>
        <div className="filter-box sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full bg-transparent body-text outline-none placeholder:text-slate-400"
            placeholder="ค้นหา title, detail, พนักงาน หรือสาขา"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {error ? <div className="surface-danger p-4 body-text">{error}</div> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.length ? (
            tab === 'all' ? (
              <>
                <AlertSection title="ยังไม่รับทราบ" subtitle="รายการที่ต้องกดรับทราบหรือจัดการต่อ" alerts={groupedAlerts.unacknowledged}>
                  {groupedAlerts.unacknowledged.length ? groupedAlerts.unacknowledged.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      employee={employees.find((employee) => String(employee.id) === String(alert.employee_id))}
                      branch={branches.find((branch) => String(branch.id) === String(alert.branch_id))}
                      isOpen={expandedId === alert.id}
                      onToggle={() => setExpandedId((current) => (current === alert.id ? null : alert.id))}
                      onAck={handleAcknowledge}
                      onEdit={() => openEditor(alert)}
                      acking={ackingId === alert.id}
                      onDelete={async () => {
                        if (window.confirm('ยืนยันลบแจ้งเตือนนี้?')) {
                          await deleteAlert(alert.id);
                        }
                      }}
                    />
                  )) : (
                    <div className="surface-success p-5 text-center body-strong">ไม่มีรายการค้างรับทราบ</div>
                  )}
                </AlertSection>
                <AlertSection title="รับทราบแล้ว" subtitle="รายการที่ถูกบันทึกลงฐานข้อมูลแล้ว รีเฟรชหน้าก็ยังคงสถานะเดิม" alerts={groupedAlerts.acknowledged}>
                  {groupedAlerts.acknowledged.length ? groupedAlerts.acknowledged.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      employee={employees.find((employee) => String(employee.id) === String(alert.employee_id))}
                      branch={branches.find((branch) => String(branch.id) === String(alert.branch_id))}
                      isOpen={expandedId === alert.id}
                      onToggle={() => setExpandedId((current) => (current === alert.id ? null : alert.id))}
                      onAck={handleAcknowledge}
                      onEdit={() => openEditor(alert)}
                      acking={ackingId === alert.id}
                      onDelete={async () => {
                        if (window.confirm('ยืนยันลบแจ้งเตือนนี้?')) {
                          await deleteAlert(alert.id);
                        }
                      }}
                    />
                  )) : (
                    <div className="surface-muted p-5 text-center body-text">ยังไม่มีรายการที่รับทราบแล้ว</div>
                  )}
                </AlertSection>
              </>
            ) : filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                employee={employees.find((employee) => String(employee.id) === String(alert.employee_id))}
                branch={branches.find((branch) => String(branch.id) === String(alert.branch_id))}
                isOpen={expandedId === alert.id}
                onToggle={() => setExpandedId((current) => (current === alert.id ? null : alert.id))}
                onAck={handleAcknowledge}
                onEdit={() => openEditor(alert)}
                acking={ackingId === alert.id}
                onDelete={async () => {
                  if (window.confirm('ยืนยันลบแจ้งเตือนนี้?')) {
                    await deleteAlert(alert.id);
                  }
                }}
              />
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">ไม่พบแจ้งเตือนที่ตรงกับเงื่อนไข</div>
          )}
        </div>
      )}

      <EditAlertModal
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingAlert(null); }}
        onSave={handleSave}
        employees={employees}
        branches={branches}
        initialData={editingAlert}
        saving={saving}
      />
    </div>
  );
}

