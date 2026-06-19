import { CalendarDays } from "lucide-react";
import { Button } from "./ui/Button";
import { fmtDate, thaiLongDate } from "../lib/date";

function startOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function rangeFor(type, anchor = new Date()) {
  const current = startOfLocalDay(anchor);

  if (type === "today") {
    const value = fmtDate(current);
    return { from: value, to: value };
  }

  if (type === "week") {
    const dayOfWeek = current.getDay();
    const firstDay = new Date(current);
    firstDay.setDate(current.getDate() - ((dayOfWeek + 6) % 7));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    return { from: fmtDate(firstDay), to: fmtDate(lastDay) };
  }

  const start = new Date(current.getFullYear(), current.getMonth(), 1);
  const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  return { from: fmtDate(start), to: fmtDate(end) };
}

function activePreset(from, to) {
  const today = startOfLocalDay();
  const todayRange = rangeFor("today", today);
  if (from === todayRange.from && to === todayRange.to) return "today";

  const weekRange = rangeFor("week", today);
  if (from === weekRange.from && to === weekRange.to) return "week";

  const monthRange = rangeFor("month", today);
  if (from === monthRange.from && to === monthRange.to) return "month";

  return null;
}

function rangeText(from, to) {
  if (!from || !to) return "";
  if (from === to) return thaiLongDate(from);
  return `${thaiLongDate(from)} - ${thaiLongDate(to)}`;
}

export function DateBar({ from, to, setFrom, setTo }) {
  const selectedPreset = activePreset(from, to);

  function applyRange(type) {
    const range = rangeFor(type);
    setFrom(range.from);
    setTo(range.to);
  }

  function updateFrom(value) {
    setFrom(value);
  }

  function updateTo(value) {
    setTo(value);
  }

  return (
    <div className="date-bar">
      <div className="date-bar-main">
        <div className="date-range-fields">
          <div className="date-range-top">
            <div className="date-range-heading">
              <span className="date-range-icon">
                <CalendarDays size={16} />
              </span>
              <div>
                <span className="caption text-slate-500">ช่วงวันที่</span>
                <div className="date-label">{rangeText(from, to)}</div>
              </div>
            </div>
            <div className="date-preset-row">
              <Button
                variant="ghost"
                size="sm"
                className={`date-btn ${selectedPreset === "today" ? "active" : ""}`}
                onClick={() => applyRange("today")}
              >
                วันนี้
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`date-btn ${selectedPreset === "week" ? "active" : ""}`}
                onClick={() => applyRange("week")}
              >
                สัปดาห์นี้
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`date-btn ${selectedPreset === "month" ? "active" : ""}`}
                onClick={() => applyRange("month")}
              >
                เดือนนี้
              </Button>
            </div>
          </div>
          <div className="date-range-inputs">
            <input
              type="date"
              value={from || ""}
              onChange={(event) => updateFrom(event.target.value)}
            />
            <span className="caption text-slate-400">ถึง</span>
            <input
              type="date"
              value={to || ""}
              onChange={(event) => updateTo(event.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
