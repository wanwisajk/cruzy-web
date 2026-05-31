import { CalendarDays } from 'lucide-react';
import { fmtDate, thaiLongDate } from '../lib/date';

export function DateBar({ from, to, setFrom, setTo }) {
  function updateFrom(value) {
    setFrom(value);
    if (value > to) setTo(value);
  }

  function updateTo(value) {
    setTo(value);
    if (value < from) setFrom(value);
  }

  function preset(type) {
    const today = new Date();
    if (type === 'today') {
      const value = fmtDate(today);
      setFrom(value);
      setTo(value);
      return;
    }
    if (type === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setFrom(fmtDate(start));
      setTo(fmtDate(today));
      return;
    }
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    setFrom(fmtDate(start));
    setTo(fmtDate(today));
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5">
      <CalendarDays size={16} className="text-slate-400" />
      <input type="date" value={from} onChange={(event) => updateFrom(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-cruzy" />
      <span className="text-xs text-slate-400">ถึง</span>
      <input type="date" value={to} onChange={(event) => updateTo(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-cruzy" />
      <button className="btn btn-ghost" onClick={() => preset('today')}>วันนี้</button>
      <button className="btn btn-ghost" onClick={() => preset('week')}>7 วัน</button>
      <button className="btn btn-ghost" onClick={() => preset('month')}>เดือนนี้</button>
      <span className="text-xs font-bold text-cruzy">{from === to ? thaiLongDate(from) : `${thaiLongDate(from)} - ${thaiLongDate(to)}`}</span>
    </div>
  );
}
