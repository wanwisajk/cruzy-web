import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Search, Plus, Trash2 } from 'lucide-react';
import { thaiShortDate, formatDbTime } from '../lib/date.js';
import { useAlerts } from '../features/alerts/hooks/useAlerts.js';

const TYPE_CONFIG = {
  absent: { label: 'ขาดงาน', color: 'bg-red-50 text-red-700', badge: 'bg-red-100 text-red-800', icon: '👤' },
  late: { label: 'มาสาย', color: 'bg-orange-50 text-orange-700', badge: 'bg-orange-100 text-orange-800', icon: '⏰' },
  early: { label: 'กลับก่อนเวลา', color: 'bg-yellow-50 text-yellow-700', badge: 'bg-yellow-100 text-yellow-800', icon: '🏃' },
  nocheck: { label: 'ไม่ Check-out', color: 'bg-blue-50 text-blue-700', badge: 'bg-blue-100 text-blue-800', icon: '❓' }
};

const SEVERITY_CONFIG = {
  critical: { label: 'วิกฤต', className: 'bg-red-100 text-red-800' },
  warning: { label: 'แจ้งเตือน', className: 'bg-orange-100 text-orange-800' }
};

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function AlertCard({ alert, employee, branch, isOpen, onToggle, onAck, onEdit, onDelete }) {
  const config = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.late;
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md ${alert.is_acknowledged ? 'opacity-70' : ''}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-3xl border ${config.badge}`}>{config.icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-sm font-bold text-slate-900">
              <span>{alert.title}</span>
              <Badge className={severity.className}>{severity.label}</Badge>
            </div>
            <div className="mt-1 text-sm text-slate-500">{employee?.name || alert.employee_id} · {branch?.code || alert.branch_id} · {thaiShortDate(alert.work_date)}</div>
            <div className="mt-2 text-sm text-slate-700">{alert.detail || '-'}</div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Badge className={config.badge}>{config.label}</Badge>
            <Badge className={alert.is_acknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{alert.is_acknowledged ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ'}</Badge>
          </div>
          <div className="text-right text-xs text-slate-500">{formatDbTime(alert.alert_time) || 'ไม่ระบุเวลา'}</div>
          <div className="flex gap-2 pt-2">
            {!alert.is_acknowledged ? (
              <button type="button" onClick={(event) => { event.stopPropagation(); onAck(alert); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <Check size={14} /> รับทราบ
              </button>
            ) : null}
            <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(alert); }} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              แก้ไข
            </button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(alert); }} className="rounded-2xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className={`border-t border-slate-100 px-4 py-3 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="text-xs text-slate-500">สาขา</div>
            <div className="mt-2 font-semibold text-slate-900">{branch?.name || '-'}</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="text-xs text-slate-500">พนักงาน</div>
            <div className="mt-2 font-semibold text-slate-900">{employee?.name || '-'}</div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="text-xs text-slate-500">ประเภท</div>
            <div className="mt-2 font-semibold text-slate-900">{config.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
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
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{initialData ? 'แก้ไขแจ้งเตือน' : 'สร้างแจ้งเตือนใหม่'}</h2>
            <p className="mt-1 text-sm text-slate-500">เชื่อมข้อมูลกับ backend โดยตรง</p>
          </div>
          <button type="button" className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" onClick={onClose}>×</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>ผู้แจ้งเตือน</span>
            <select value={form.employee_id} onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))} className="input w-full">
              <option value="">เลือกพนักงาน</option>
              {employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>สาขา</span>
            <select value={form.branch_id} onChange={(event) => setForm((prev) => ({ ...prev, branch_id: Number(event.target.value) }))} className="input w-full">
              <option value="">เลือกสาขา</option>
              {branchOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>ประเภทแจ้งเตือน</span>
            <select value={form.alert_type} onChange={(event) => setForm((prev) => ({ ...prev, alert_type: event.target.value }))} className="input w-full">
              {Object.entries(TYPE_CONFIG).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>ความร้ายแรง</span>
            <select value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))} className="input w-full">
              {Object.entries(SEVERITY_CONFIG).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>วันที่</span>
            <input type="date" value={form.work_date} onChange={(event) => setForm((prev) => ({ ...prev, work_date: event.target.value }))} className="input w-full" />
          </label>
          <label className="space-y-2 text-sm">
            <span>เวลา</span>
            <input type="time" value={form.alert_time} onChange={(event) => setForm((prev) => ({ ...prev, alert_time: event.target.value }))} className="input w-full" />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="space-y-2 text-sm">
            <span>หัวข้อ</span>
            <input type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="input w-full" />
          </label>
          <label className="space-y-2 text-sm">
            <span>รายละเอียด</span>
            <textarea rows="4" value={form.detail} onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))} className="input w-full resize-none" />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">ยกเลิก</button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="rounded-2xl bg-[#1B5E20] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">บันทึก</button>
        </div>
      </div>
    </div>
  );
}

export default function AlertPage({ data, currentBranch }) {
  const { alerts, loading, saving, error, createAlert, updateAlert, acknowledgeAlert, deleteAlert } = useAlerts();
  const [tab, setTab] = useState('unack');
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const employees = data?.employees ?? [];
  const branches = data?.branches ?? [];

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => currentBranch === 'all' || alert.branch_id === currentBranch)
      .filter((alert) => {
        if (tab === 'unack') return !alert.is_acknowledged;
        if (tab === 'all') return true;
        return alert.alert_type === tab;
      })
      .filter((alert) => {
        const value = searchTerm.trim().toLowerCase();
        if (!value) return true;
        return [alert.title, alert.detail, alert.alert_type, alert.severity].some((field) => String(field || '').toLowerCase().includes(value))
          || employees.find((employee) => employee.id === alert.employee_id)?.name.toLowerCase().includes(value)
          || branches.find((branch) => branch.id === alert.branch_id)?.code.toLowerCase().includes(value);
      });
  }, [alerts, currentBranch, tab, searchTerm, employees, branches]);

  const stats = useMemo(() => ({
    total: alerts.length,
    unack: alerts.filter((alert) => !alert.is_acknowledged).length,
    critical: alerts.filter((alert) => alert.severity === 'critical').length
  }), [alerts]);

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

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <AlertTriangle size={20} />
            <span>ระบบแจ้งเตือน</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">อิง UI จาก AlertUI และดึงข้อมูลจาก backend จริง</div>
        </div>
        <button type="button" onClick={() => openEditor(null)} className="inline-flex items-center gap-2 rounded-2xl bg-[#1B5E20] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600">
          <Plus size={16} /> สร้างแจ้งเตือน
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">ทั้งหมด</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">ยังไม่รับทราบ</div>
          <div className="mt-3 text-3xl font-bold text-orange-700">{stats.unack}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">วิกฤต</div>
          <div className="mt-3 text-3xl font-bold text-red-700">{stats.critical}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'unack', label: 'ยังไม่รับทราบ' },
            { id: 'absent', label: 'ขาดงาน' },
            { id: 'late', label: 'มาสาย' },
            { id: 'early', label: 'กลับก่อน' },
            { id: 'nocheck', label: 'ไม่ Check-out' }
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-[#1B5E20] text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">สาขา: {currentBranch === 'all' ? 'ทั้งหมด' : branches.find((branch) => branch.id === currentBranch)?.code || currentBranch}</span>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="ค้นหา title, detail, พนักงาน หรือสาขา"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 rounded-3xl bg-slate-200" />
          <div className="h-24 rounded-3xl bg-slate-200" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.length ? (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                employee={employees.find((employee) => employee.id === alert.employee_id)}
                branch={branches.find((branch) => branch.id === alert.branch_id)}
                isOpen={expandedId === alert.id}
                onToggle={() => setExpandedId((current) => (current === alert.id ? null : alert.id))}
                onAck={async () => acknowledgeAlert(alert.id)}
                onEdit={() => openEditor(alert)}
                onDelete={async () => {
                  if (window.confirm('ยืนยันลบแจ้งเตือนนี้?')) {
                    await deleteAlert(alert.id);
                  }
                }}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">ไม่พบแจ้งเตือนที่ตรงกับเงื่อนไข</div>
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
