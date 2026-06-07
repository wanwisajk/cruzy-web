import React from 'react';
import { Activity, CalendarDays, Database, FileClock, Search, ShieldCheck, UserRound } from 'lucide-react';
import {
  SOURCE_CONFIG,
  auditLogSentence,
  changedFieldLabels,
  getActionConfig,
  formatDateTime,
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

export function ChangeSummary({ log }) {
  const fields = changedFieldLabels(log);
  if (!fields.total) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">รายละเอียดที่เปลี่ยน:</span>
      {fields.visible.map((field) => (
        <span key={field} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {field}
        </span>
      ))}
      {fields.extraCount ? (
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
          อีก {fields.extraCount} รายการ
        </span>
      ) : null}
    </div>
  );
}

export function LogRow({ log }) {
  const action = getActionConfig(log.action);
  const actorMeta = log.actor_type === 'user' ? 'ผู้ใช้ระบบ' : (log.actor_type || '');
  const subjectLabel = log.employee_name || log.subject || log.record_id || '-';
  const sentence = auditLogSentence(log);

  return (
    <article className="border-b border-slate-100 bg-white px-4 py-5 last:border-b-0 hover:bg-slate-50/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${action.className}`}>
            {action.label}
          </span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{log.module || '-'}</span>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
              {SOURCE_CONFIG[log.source] || log.source || 'Source'}
            </span>
            <span className="text-xs font-semibold text-slate-400">{formatDateTime(log.created_at)}</span>
          </div>
          <div className="text-base font-bold leading-7 text-slate-950">{sentence}</div>
          {log.reason ? <div className="mt-1 text-xs font-medium text-amber-700">เหตุผล: {log.reason}</div> : null}
          <ChangeSummary log={log} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-600 lg:max-w-[260px] lg:justify-end">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
            <UserRound size={14} className="text-slate-400" />
            <span className="truncate font-semibold text-slate-800">{log.user_name || 'system'}</span>
          </div>
          {actorMeta ? (
            <div className="rounded-full bg-slate-100 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-500">
              {actorMeta}
            </div>
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
            <Database size={14} className="text-slate-400" />
            <span className="truncate">{subjectLabel}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
            <ShieldCheck size={14} className="text-slate-400" />
            <span className="truncate">{log.branch || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
