import { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  CalendarDays,
  Database,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { useAuditLogs } from '../features/auditLogs/hooks/useAuditLogs.js';

const ACTION_CONFIG = {
  CREATE: { label: 'สร้าง', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  UPDATE: { label: 'แก้ไข', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  APPROVE: { label: 'อนุมัติ', className: 'bg-violet-50 text-violet-700 ring-violet-100' },
  REJECT: { label: 'ปฏิเสธ', className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  DELETE: { label: 'ลบ', className: 'bg-red-50 text-red-700 ring-red-100' },
  EDIT: { label: 'แก้ไข', className: 'bg-blue-50 text-blue-700 ring-blue-100' },
  INFO: { label: 'ข้อมูล', className: 'bg-slate-50 text-slate-700 ring-slate-100' }
};

const SOURCE_CONFIG = {
  audit: 'Audit',
  dashboard: 'Dashboard',
  db_trigger: 'DB Trigger',
  inspection: 'Inspection',
  sales: 'Sales',
  liff: 'LIFF',
  api: 'API'
};

const SUPPORTED_MODULES = [
  'ตารางงาน',
  'พนักงาน',
  'ค่าคอม',
  'หนังสือเตือน',
  'การลา',
  'กติกาพนักงาน',
  'ยอดขาย',
  'ตรวจร้าน',
  'ระบบ'
];

const SUPPORTED_TABLES = [
  'schedules',
  'employees',
  'employee_pay_profiles',
  'warning_letters',
  'leaves',
  'leave_balances',
  'employee_branch_eligibility',
  'employee_availability_rules',
  'employee_availability_overrides',
  'sales_logs',
  'inspection_logs',
  'system_audit_logs'
];

const DEFAULT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];
const DEFAULT_SOURCES = ['db_trigger', 'dashboard', 'audit', 'sales', 'inspection', 'liff', 'api'];

function dateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function normalizeAction(action) {
  return String(action || 'INFO').toUpperCase();
}

function getActionConfig(action) {
  return ACTION_CONFIG[normalizeAction(action)] || ACTION_CONFIG.INFO;
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))];
}

function mergeOptions(defaults, values) {
  return [...new Set([...defaults, ...values].filter(Boolean))];
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function hasObjectValue(value) {
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        <option value="all">ทั้งหมด</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ChangeDiff({ log }) {
  const oldValue = hasObjectValue(log.old_value) ? log.old_value : {};
  const newValue = hasObjectValue(log.new_value) ? log.new_value : {};
  const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])];

  if (!keys.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {keys.slice(0, 6).map((key) => (
        <div key={key} className="grid gap-2 border-b border-slate-200 px-3 py-2 text-xs last:border-b-0 md:grid-cols-[120px_1fr_1fr]">
          <div className="font-bold text-slate-500">{key}</div>
          <div className="rounded-md bg-white px-2 py-1 text-rose-700 line-through ring-1 ring-slate-100">
            {stringifyValue(oldValue[key])}
          </div>
          <div className="rounded-md bg-white px-2 py-1 font-semibold text-emerald-700 ring-1 ring-slate-100">
            {stringifyValue(newValue[key])}
          </div>
        </div>
      ))}
      {keys.length > 6 ? (
        <div className="px-3 py-2 text-xs font-semibold text-slate-500">มีรายละเอียดเพิ่มเติม {keys.length - 6} รายการ</div>
      ) : null}
    </div>
  );
}

function LogRow({ log }) {
  const action = getActionConfig(log.action);
  const actorMeta = [log.actor_type, log.actor_id].filter(Boolean).join(' #');

  return (
    <article className="border-b border-slate-100 bg-white px-4 py-4 last:border-b-0 hover:bg-slate-50/70">
      <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px]">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">{formatDateTime(log.created_at)}</div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${action.className}`}>
            {action.label}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{log.module || '-'}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">{log.table_name || '-'}</span>
            <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {SOURCE_CONFIG[log.source] || log.source || 'Source'}
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-950">{log.description || 'ไม่มีรายละเอียด'}</div>
          {log.reason ? <div className="mt-1 text-xs font-medium text-amber-700">เหตุผล: {log.reason}</div> : null}
          <ChangeDiff log={log} />
        </div>

        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <UserRound size={14} className="text-slate-400" />
            <span className="truncate font-semibold text-slate-800">{log.user_name || 'system'}</span>
          </div>
          {actorMeta ? (
            <div className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-500">
              {actorMeta}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Database size={14} className="text-slate-400" />
            <span className="truncate">{log.subject || log.record_id || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-slate-400" />
            <span className="truncate">{log.branch || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LogPage() {
  const { auditLogs, loading, error, refreshAuditLogs } = useAuditLogs();
  const [fromDate, setFromDate] = useState(() => dateInput(-7));
  const [toDate, setToDate] = useState(() => dateInput(0));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAction, setActiveAction] = useState('all');
  const [activeModule, setActiveModule] = useState('all');
  const [activeTable, setActiveTable] = useState('all');
  const [activeSource, setActiveSource] = useState('all');

  const normalizedLogs = useMemo(() => {
    return auditLogs.map((log) => ({
      ...log,
      action: normalizeAction(log.action),
      module: log.module || log.page || log.table_name || '-',
      subject: log.subject || log.record_id || '-',
      actor_type: log.actor_type || '',
      actor_id: log.actor_id || ''
    }));
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return normalizedLogs.filter((log) => {
      if (activeAction !== 'all' && log.action !== activeAction) return false;
      if (activeModule !== 'all' && log.module !== activeModule) return false;
      if (activeTable !== 'all' && log.table_name !== activeTable) return false;
      if (activeSource !== 'all' && log.source !== activeSource) return false;
      if (!search) return true;

      return [
        log.user_name,
        log.description,
        log.action,
        log.module,
        log.table_name,
        log.subject,
        log.branch,
        log.source,
        log.actor_type,
        log.actor_id
      ].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [normalizedLogs, activeAction, activeModule, activeTable, activeSource, searchTerm]);

  const actions = useMemo(() => mergeOptions(DEFAULT_ACTIONS, uniqueValues(normalizedLogs, 'action')), [normalizedLogs]);
  const modules = useMemo(() => mergeOptions(SUPPORTED_MODULES, uniqueValues(normalizedLogs, 'module')), [normalizedLogs]);
  const tables = useMemo(() => mergeOptions(SUPPORTED_TABLES, uniqueValues(normalizedLogs, 'table_name')), [normalizedLogs]);
  const sources = useMemo(() => mergeOptions(DEFAULT_SOURCES, uniqueValues(normalizedLogs, 'source')), [normalizedLogs]);

  const topModules = useMemo(() => {
    const counts = filteredLogs.reduce((acc, log) => {
      acc[log.module] = (acc[log.module] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [filteredLogs]);

  const handleSearch = useCallback(() => {
    refreshAuditLogs({
      from_date: fromDate,
      to_date: toDate,
      search: searchTerm.trim(),
      action: activeAction !== 'all' ? activeAction : undefined,
      module: activeModule !== 'all' ? activeModule : undefined,
      table_name: activeTable !== 'all' ? activeTable : undefined,
      source: activeSource !== 'all' ? activeSource : undefined
    });
  }, [fromDate, toDate, searchTerm, activeAction, activeModule, activeTable, activeSource, refreshAuditLogs]);

  const resetFilters = useCallback(() => {
    setFromDate(dateInput(-7));
    setToDate(dateInput(0));
    setSearchTerm('');
    setActiveAction('all');
    setActiveModule('all');
    setActiveTable('all');
    setActiveSource('all');
    refreshAuditLogs({ from_date: dateInput(-7), to_date: dateInput(0) });
  }, [refreshAuditLogs]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-emerald-900/20 bg-emerald-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/15">
              <FileClock size={21} />
            </div>
            <div>
              <h1 className="text-base font-bold">Cruzy Activity Log</h1>
              <p className="text-xs font-medium text-emerald-100">รวมประวัติจาก DB trigger และ log เฉพาะทาง</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
          >
            <RefreshCw size={16} />
            โหลดใหม่
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <section className="grid gap-3 md:grid-cols-4">
          <StatCard icon={Activity} label="รายการที่แสดง" value={filteredLogs.length.toLocaleString('th-TH')} tone="bg-emerald-50 text-emerald-700" />
          <StatCard icon={Database} label="โมดูลที่รองรับ" value={SUPPORTED_MODULES.length.toLocaleString('th-TH')} tone="bg-blue-50 text-blue-700" />
          <StatCard icon={Filter} label="ประเภทคำสั่ง" value={actions.length.toLocaleString('th-TH')} tone="bg-violet-50 text-violet-700" />
          <StatCard icon={CalendarDays} label="ช่วงวันที่" value={`${fromDate} - ${toDate}`} tone="bg-amber-50 text-amber-700" />
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              ตั้งแต่วันที่
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              ถึงวันที่
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาผู้ใช้ รายละเอียด สาขา โมดูล"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <Search size={16} />
              ค้นหา
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              ล้างตัวกรอง
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <SelectFilter label="คำสั่ง" value={activeAction} onChange={setActiveAction} options={actions} />
            <SelectFilter label="โมดูล" value={activeModule} onChange={setActiveModule} options={modules} />
            <SelectFilter label="ตารางข้อมูล" value={activeTable} onChange={setActiveTable} options={tables} />
            <SelectFilter label="แหล่งข้อมูล" value={activeSource} onChange={setActiveSource} options={sources} />
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-950">ประวัติการทำงานทั้งหมด</h2>
                <p className="text-xs font-medium text-slate-500">เรียงจากรายการล่าสุด และรวม log จากหลายตาราง</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {filteredLogs.length.toLocaleString('th-TH')} รายการ
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center text-sm font-semibold text-slate-500">
                กำลังโหลดประวัติ...
              </div>
            ) : filteredLogs.length ? (
              <div>
                {filteredLogs.map((log) => (
                  <LogRow key={log.id || `${log.table_name}-${log.raw_id}-${log.created_at}`} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                <FileClock size={34} className="text-slate-300" />
                <div className="mt-3 text-sm font-bold text-slate-700">ไม่พบประวัติในเงื่อนไขนี้</div>
                <div className="mt-1 text-xs font-medium text-slate-500">ลองขยายช่วงวันที่ หรือล้างตัวกรองบางส่วน</div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-950">โมดูลที่มีการเคลื่อนไหว</h3>
              <div className="mt-3 space-y-2">
                {topModules.length ? topModules.map(([moduleName, count]) => (
                  <button
                    type="button"
                    key={moduleName}
                    onClick={() => setActiveModule(moduleName)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50"
                  >
                    <span className="truncate text-sm font-semibold text-slate-700">{moduleName}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{count}</span>
                  </button>
                )) : (
                  <div className="text-xs font-medium text-slate-500">ยังไม่มีข้อมูล</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-950">สถานะการรวม Log</h3>
              <div className="mt-3 space-y-2 text-xs font-medium text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span>DB trigger modules</span>
                  <span className="font-bold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>System audit</span>
                  <span className="font-bold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Sales edit log</span>
                  <span className="font-bold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Inspection log</span>
                  <span className="font-bold text-emerald-700">เปิดใช้</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
