import React from 'react';
import { Activity, CalendarDays, Database, FileClock, Search, ShieldCheck, UserRound } from 'lucide-react';
import {
  SOURCE_CONFIG,
  getActionConfig,
  formatDateTime,
  hasObjectValue,
  stringifyValue
} from '../auditLogUtils.js';

export function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        <option value="all">ทั้งหมด</option>
        {options.map((option) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          return (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          );
        })}
      </select>
    </label>
  );
}

export function ChangeDiff({ log }) {
  const oldValue = hasObjectValue(log.old_value) ? log.old_value : {};
  const newValue = hasObjectValue(log.new_value) ? log.new_value : {};
  const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])];

  if (!keys.length) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {keys.slice(0, 6).map((key) => (
        <div key={key} className="grid gap-2 border-b border-slate-200 px-3 py-2 text-xs last:border-b-0 md:grid-cols-[120px_1fr_1fr]">
          <div className="font-semibold text-slate-500">{key}</div>
          <div className="rounded-xl bg-white px-2 py-1 text-rose-700 line-through ring-1 ring-slate-100">
            {stringifyValue(oldValue[key])}
          </div>
          <div className="rounded-xl bg-white px-2 py-1 font-semibold text-emerald-700 ring-1 ring-slate-100">
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

export function LogRow({ log }) {
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
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{log.module || '-'}</span>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
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
            <div className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-500">
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
