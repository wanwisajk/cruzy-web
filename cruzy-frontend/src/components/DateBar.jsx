import { CalendarDays } from "lucide-react";
import { Button } from "./ui/Button";
import { fmtDate, thaiLongDate } from "../lib/date";

export function DateBar({ from, to, setFrom, setTo }) {
  function getActivePreset() {
    const today = new Date();
    const todayStr = fmtDate(today);

    if (from === todayStr && to === todayStr) return "today";

    const dayOfWeek = today.getDay();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    if (from === fmtDate(firstDay) && to === fmtDate(lastDay)) return "week";

    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (from === fmtDate(start) && to === fmtDate(end)) return "month";

    return null;
  }

  const activePreset = getActivePreset();

  function updateFrom(value) {
    const start = new Date(`${value}T00:00:00`);
    setFrom(fmtDate(start));
  }

  function updateTo(value) {
    const end = new Date(`${value}T00:00:00`);
    setTo(fmtDate(end));
  }

  function preset(type) {
    const today = new Date();
    if (type === "today") {
      const value = fmtDate(today);
      setFrom(value);
      setTo(value);
      return;
    }
    if (type === "week") {
      const dayOfWeek = today.getDay();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setFrom(fmtDate(firstDay));
      setTo(fmtDate(lastDay));
      return;
    }
    if (type === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFrom(fmtDate(start));
      setTo(fmtDate(end));
      return;
    }
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    setFrom(fmtDate(start));
    setTo(fmtDate(today));
  }

  return (
    <div className="date-bar">
      <CalendarDays size={16} className="text-slate-400" />
      <input
        type="date"
        value={from}
        onChange={(event) => updateFrom(event.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 caption outline-none focus:border-cruzy"
      />
      <span className="caption text-slate-400">ถึง</span>
      <input
        type="date"
        value={to}
        onChange={(event) => updateTo(event.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 caption outline-none focus:border-cruzy"
      />
      <Button
        variant="ghost"
        className={`date-btn ${activePreset === "today" ? "active" : ""}`}
        onClick={() => preset("today")}
      >
        วันนี้
      </Button>
      <Button
        variant="ghost"
        className={`date-btn ${activePreset === "week" ? "active" : ""}`}
        onClick={() => preset("week")}
      >
        สัปดาห์นี้
      </Button>
      <Button
        variant="ghost"
        className={`date-btn ${activePreset === "month" ? "active" : ""}`}
        onClick={() => preset("month")}
      >
        เดือนนี้
      </Button>
      <span className="date-label">
        {from === to
          ? thaiLongDate(from)
          : `${thaiLongDate(from)} - ${thaiLongDate(to)}`}
      </span>
    </div>
  );
}
