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
    <div className="section-card-sm min-w-[170px] shrink-0 sm:min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="caption-strong text-slate-500">{label}</div>
          <div className="mt-1 stat-number text-slate-950">{value}</div>
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
    <label className="flex min-w-[170px] flex-1 flex-col gap-1 caption-strong text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input body-strong"
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
      <span className="caption-strong text-slate-500">รายละเอียดที่เปลี่ยน:</span>
      {fields.visible.map((field) => (
        <span key={field} className="badge inactive">
          {field}
        </span>
      ))}
      {fields.extraCount ? (
        <span className="badge approved">
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
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 caption-bold ring-1 ${action.className}`}>
            {action.label}
          </span>
            <span className="badge approved">{log.module || '-'}</span>
            <span className="badge inactive">
              {SOURCE_CONFIG[log.source] || log.source || 'Source'}
            </span>
            <span className="caption-strong text-slate-400">{formatDateTime(log.created_at)}</span>
          </div>
          <div className="heading-3 leading-7 text-slate-950">{sentence}</div>
          {log.reason ? <div className="mt-1 caption-strong text-amber-700">เหตุผล: {log.reason}</div> : null}
          <ChangeSummary log={log} />
        </div>

        <div className="flex flex-wrap gap-2 caption text-slate-600 lg:max-w-[260px] lg:justify-end">
          <div className="summary-pill">
            <UserRound size={14} className="text-slate-400" />
            <span className="truncate body-strong text-slate-800">{log.user_name || 'system'}</span>
          </div>
          {actorMeta ? (
            <div className="summary-pill font-mono">
              {actorMeta}
            </div>
          ) : null}
          <div className="summary-pill">
            <Database size={14} className="text-slate-400" />
            <span className="truncate">{subjectLabel}</span>
          </div>
          <div className="summary-pill">
            <ShieldCheck size={14} className="text-slate-400" />
            <span className="truncate">{log.branch || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
