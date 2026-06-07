import { useState, useMemo, useCallback } from 'react';
import { Activity, CalendarDays, Database, FileClock, Filter, RefreshCw, Search } from 'lucide-react';
import { useAuditLogs } from './hooks/useAuditLogs.js';
import {
  DEFAULT_ACTIONS,
  DEFAULT_SOURCES,
  SUPPORTED_MODULES,
  SUPPORTED_TABLES,
  dateInput,
  mergeOptions,
  normalizeAction,
  uniqueValues,
  friendlyModuleName,
  friendlyTableName,
  getActionConfig,
  SOURCE_CONFIG
} from './auditLogUtils.js';
import { StatCard, SelectFilter, LogRow } from './components/AuditLogComponents.jsx';

export default function AuditLogPage() {
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
      module: friendlyModuleName(log.module || log.page || log.table_name || '-'),
      table_label: friendlyTableName(log.table_name),
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

  const actions = useMemo(
    () => mergeOptions(DEFAULT_ACTIONS, uniqueValues(normalizedLogs, 'action'))
      .map((action) => ({ value: action, label: getActionConfig(action).label })),
    [normalizedLogs]
  );
  const modules = useMemo(
    () => uniqueValues(normalizedLogs, 'module')
      .map((module) => ({ value: module, label: friendlyModuleName(module) })),
    [normalizedLogs]
  );
  const tables = useMemo(
    () => mergeOptions(SUPPORTED_TABLES, uniqueValues(normalizedLogs, 'table_name'))
      .map((table_name) => ({ value: table_name, label: friendlyTableName(table_name) })),
    [normalizedLogs]
  );
  const sources = useMemo(
    () => mergeOptions(DEFAULT_SOURCES, uniqueValues(normalizedLogs, 'source'))
      .map((source) => ({ value: source, label: SOURCE_CONFIG[source] || source })),
    [normalizedLogs]
  );

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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <FileClock size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950">บันทึกกิจกรรมระบบ</h1>
              <p className="text-sm text-slate-500">ดูเหตุการณ์และการเปลี่ยนแปลงสำคัญจากระบบทั้งหมด</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <section className="grid gap-3 md:grid-cols-4">
          <StatCard icon={Activity} label="รายการที่แสดง" value={filteredLogs.length.toLocaleString('th-TH')} tone="bg-emerald-50 text-emerald-700" />
          <StatCard icon={Database} label="โมดูลหลัก" value={SUPPORTED_MODULES.length.toLocaleString('th-TH')} tone="bg-blue-50 text-blue-700" />
          <StatCard icon={Filter} label="ประเภทคำสั่ง" value={actions.length.toLocaleString('th-TH')} tone="bg-violet-50 text-violet-700" />
          <StatCard icon={CalendarDays} label="ช่วงวันที่" value={`${fromDate} - ${toDate}`} tone="bg-amber-50 text-amber-700" />
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
              เริ่มวันที่
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
              ถึงวันที่
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้, รายละเอียด, สาขา, โมดูล"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <Search size={16} />
              ค้นหา
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ล้างตัวกรอง
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SelectFilter label="คำสั่ง" value={activeAction} onChange={setActiveAction} options={actions} />
            <SelectFilter label="โมดูล" value={activeModule} onChange={setActiveModule} options={modules} />
            <SelectFilter label="หมวดข้อมูล" value={activeTable} onChange={setActiveTable} options={tables} />
            <SelectFilter label="แหล่งข้อมูล" value={activeSource} onChange={setActiveSource} options={sources} />
          </div>
        </section>

        {error ? (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-950">ประวัติการทำงานทั้งหมด</h2>
                <p className="text-xs font-medium text-slate-500">แสดงรายการล่าสุดจากทุกระบบที่เก็บบันทึกไว้</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredLogs.length.toLocaleString('th-TH')} รายการ
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center text-sm font-semibold text-slate-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : filteredLogs.length ? (
              <div>
                {filteredLogs.map((log) => (
                  <LogRow key={log.id || `${log.table_name}-${log.raw_id}-${log.created_at}`} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
                <FileClock size={36} className="text-slate-300" />
                <div className="mt-3 text-sm font-bold text-slate-700">ไม่พบประวัติในเงื่อนไขที่เลือก</div>
                <div className="mt-1 text-xs font-medium text-slate-500">ลองขยายช่วงวันที่ หรือล้างตัวกรอง</div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-950">โมดูลยอดนิยม</h3>
              <div className="mt-3 space-y-2">
                {topModules.length ? topModules.map(([moduleName, count]) => (
                  <button
                    type="button"
                    key={moduleName}
                    onClick={() => setActiveModule(moduleName)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="truncate">{moduleName}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{count}</span>
                  </button>
                )) : (
                  <div className="text-xs font-medium text-slate-500">ยังไม่มีข้อมูล</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-950">ภาพรวมการรวมบันทึก</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span>DB trigger</span>
                  <span className="font-semibold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>System audit</span>
                  <span className="font-semibold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Sales edit log</span>
                  <span className="font-semibold text-emerald-700">เปิดใช้</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Inspection log</span>
                  <span className="font-semibold text-emerald-700">เปิดใช้</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
