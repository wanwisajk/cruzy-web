import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const DAY_LABELS = { จ:"จันทร์", อ:"อังคาร", พ:"พุธ", พฤ:"พฤหัส", ศ:"ศุกร์", ส:"เสาร์", อา:"อาทิตย์" };

const EMPTY_BRANCH = {
  id: "", name: "", code: "", region_id: "",
  minWeekday: 1, minWeekend: 1, minSpecial: "",
  hours:    { จ:"10:00", อ:"10:00", พ:"10:00", พฤ:"10:00", ศ:"10:00", ส:"10:00", อา:"10:00" },
  hoursEnd: { จ:"21:00", อ:"21:00", พ:"21:00", พฤ:"21:00", ศ:"21:00", ส:"21:00", อา:"21:00" },
  staffCount: 0,
};

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = (msg, type = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };
  return { toasts, push };
}

function BranchCard({ branch, onEdit, onDelete, regionName }) {
  const regionColor = { 
    cnx: "bg-sky-100 text-sky-700", 
    bkk: "bg-violet-100 text-violet-700",
    default: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-bold text-sm">{branch.code}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate leading-snug">{branch.name}</p>
            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${regionColor[branch.region_id] || regionColor.default}`}>
              {regionName}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(branch)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="แก้ไข">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onClick={() => onDelete(branch.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="ลบ">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400 font-medium">วันธรรมดา</span>
          <span className="text-sm font-bold text-slate-700">{branch.minWeekday}</span>
          <span className="text-[10px] text-slate-400">คน</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400 font-medium">วันหยุด</span>
          <span className="text-sm font-bold text-amber-600">{branch.minWeekend}</span>
          <span className="text-[10px] text-slate-400">คน</span>
        </div>
      </div>

      <div className="border-t border-slate-50 px-5 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">เวลาทำการ</p>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map(d => (
            <div key={d} className="text-center">
              <p className="text-[9px] font-bold text-slate-400 mb-0.5">{d}</p>
              <p className="text-[9px] text-slate-600 leading-tight">{(branch.hours?.[d] || "").slice(0, 5)}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{(branch.hoursEnd?.[d] || "").slice(0, 5)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchModal({ branch, regions, onClose, onSave }) {
  const [form, setForm] = useState(() => branch ? { ...branch } : { ...EMPTY_BRANCH });
  const [step, setStep] = useState(0);
  const isNew = !branch;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setHour = (type, day, val) => setForm(f => ({ ...f, [type]: { ...f[type], [day]: val } }));
  const valid = form.name.trim() && form.code.trim() && form.region_id;

  const steps = ["ข้อมูลสาขา", "จำนวนพนักงาน", "เวลาทำการ"];
  const regionColor = { cnx: "bg-sky-100 text-sky-700", bkk: "bg-violet-100 text-violet-700", default: "bg-slate-100 text-slate-700" };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              {isNew ? "➕ เพิ่มสาขาใหม่" : `✏️ แก้ไข ${form.code}`}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${step === i ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">ชื่อสาขา <span className="text-red-400">*</span></label>
                  <input
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    placeholder="เช่น Central Chiang Rai"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">รหัสสาขา <span className="text-red-400">*</span></label>
                  <input
                    value={form.code}
                    onChange={e => set("code", e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="CCR"
                    maxLength={4}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">ภูมิภาค <span className="text-red-400">*</span></label>
                  <select
                    value={form.region_id}
                    onChange={e => set("region_id", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition bg-white"
                  >
                    <option value="">เลือกภูมิภาค</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              {form.code && form.name && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <span className="text-emerald-700 font-bold text-sm">{form.code}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">{form.name}</p>
                    <p className="text-xs text-emerald-600">{regions.find(r => r.id === form.region_id)?.name}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700">
                💡 กำหนดจำนวนพนักงานขั้นต่ำที่ต้องมีในแต่ละประเภทวัน
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "วันธรรมดา", key: "minWeekday", sub: "จันทร์–ศุกร์", color: "emerald" },
                  { label: "วันหยุด", key: "minWeekend", sub: "เสาร์–อาทิตย์", color: "amber" },
                ].map(({ label, key, sub, color }) => (
                  <div key={key} className="text-center">
                    <div className={`p-4 rounded-2xl border-2 border-${color}-100 bg-${color}-50`}>
                      <p className={`text-xs font-bold mb-1 text-${color}-700`}>{label}</p>
                      <p className={`text-[10px] mb-3 text-${color}-500`}>{sub}</p>
                      <input
                        type="number"
                        min="1"
                        value={form[key] ?? ""}
                        onChange={e => set(key, Number(e.target.value))}
                        className={`w-full text-center text-2xl font-bold bg-white border rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-${color}-400 border-${color}-200 transition`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">คน</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700">
                ⏰ กำหนดเวลาเปิด–ปิดแต่ละวันในสัปดาห์
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "10:00–21:00", open: "10:00", close: "21:00" },
                  { label: "09:00–21:00", open: "09:00", close: "21:00" },
                  { label: "10:00–22:00", open: "10:00", close: "22:00" },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => {
                      const h = {}; const e = {};
                      DAYS.forEach(d => { h[d] = p.open; e[d] = p.close; });
                      setForm(f => ({ ...f, hours: h, hoursEnd: e }));
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 font-semibold transition-colors"
                  >
                    {p.label} (ทุกวัน)
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-500">วัน</p>
                  <p className="text-xs font-semibold text-slate-500 text-center">เปิด</p>
                  <p className="text-xs font-semibold text-slate-500 text-center">ปิด</p>
                </div>
                {DAYS.map((d, i) => {
                  const isWE = d === "ส" || d === "อา";
                  return (
                    <div key={d} className={`grid grid-cols-3 items-center px-4 py-2 gap-2 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${isWE ? "bg-amber-50/40" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isWE ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{d}</span>
                        <span className="text-xs text-slate-500 hidden sm:block">{DAY_LABELS[d]}</span>
                      </div>
                      <input
                        type="time"
                        value={form.hours?.[d] || "10:00"}
                        onChange={e => setHour("hours", d, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center"
                      />
                      <input
                        type="time"
                        value={form.hoursEnd?.[d] || "21:00"}
                        onChange={e => setHour("hoursEnd", d, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                ← ก่อนหน้า
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !valid}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ถัดไป →
              </button>
            ) : (
              <button onClick={() => onSave(form)} disabled={!valid}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                💾 บันทึก
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ branch, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">ลบสาขา {branch.code}?</h3>
        <p className="text-sm text-slate-500 mb-5">{branch.name}<br/>การกระทำนี้ไม่สามารถยกเลิกได้</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">ยกเลิก</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">ลบ</button>
        </div>
      </div>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg ${t.type === "err" ? "bg-red-500" : "bg-emerald-600"}`}
          style={{ animation: "slideIn .2s ease" }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function BranchSettings() {
  const [branches, setBranches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterRegion, setFilterRegion] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toasts, push } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesRes, regionsRes] = await Promise.all([
        api.getBranches(),
        api.getRegions()
      ]);
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
      setRegions(Array.isArray(regionsRes) ? regionsRes : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      push('ไม่สามารถดึงข้อมูลได้', 'err');
    } finally {
      setLoading(false);
    }
  };

  const filtered = branches.filter(b => {
    const matchRegion = filterRegion === "all" || b.region_id === filterRegion;
    const matchSearch = (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.code || '').toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  const handleSave = async (form) => {
    try {
      const exists = form.id && branches.some(b => b.id === form.id);
      const payload = { ...form };
      if (!exists) delete payload.id;

      if (exists) {
        await api.updateBranch(form.id, payload);
        setBranches(prev => prev.map(b => b.id === form.id ? form : b));
        push(`✅ อัปเดต ${form.code} สำเร็จ`);
      } else {
        const result = await api.createBranch(payload);
        setBranches(prev => [...prev, result.data]);
        push(`✅ เพิ่มสาขา ${form.code} สำเร็จ`);
      }
      setModal(null);
    } catch (error) {
      push(error.message || 'เกิดข้อผิดพลาด', 'err');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteBranch(id);
      const b = branches.find(x => x.id === id);
      setBranches(prev => prev.filter(x => x.id !== id));
      setDeleteTarget(null);
      push(`🗑 ลบสาขา ${b?.code} แล้ว`, 'err');
    } catch (error) {
      push(error.message || 'ไม่สามารถลบได้', 'err');
    }
  };

  const regionColor = { cnx: "bg-sky-100 text-sky-700", bkk: "bg-violet-100 text-violet-700", default: "bg-slate-100 text-slate-700" };

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
      `}</style>

      <div className="min-h-screen bg-slate-50 font-sans">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">⚙️ ตั้งค่าสาขา</h1>
            <p className="text-xs text-slate-400 mt-0.5">Branch Management — กำหนดคน เวลา และเงื่อนไขแต่ละสาขา</p>
          </div>
          <button
            onClick={() => setModal("add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            เพิ่มสาขาใหม่
          </button>
        </div>

        <div className="px-6 py-5 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "สาขาทั้งหมด", value: branches.length, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "เชียงใหม่", value: branches.filter(b=>b.region_id === regions.find(r => r.name === "เชียงใหม่")?.id).length, color: "text-sky-600", bg: "bg-sky-50" },
              { label: "กรุงเทพ", value: branches.filter(b=>b.region_id === regions.find(r => r.name === "กรุงเทพ")?.id).length, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "อื่น ๆ", value: branches.filter(b => !regions.some(r => r.id === b.region_id)).length, color: "text-slate-600", bg: "bg-slate-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-3`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาสาขา..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition bg-white"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "ทั้งหมด" },
                ...regions.map(r => ({ id: r.id, label: r.name }))
              ].map(r => (
                <button key={r.id} onClick={() => setFilterRegion(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filterRegion === r.id ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-2xl">⏳ กำลังโหลด...</p>
            </div>
          ) : regions.length > 0 ? (
            (filterRegion === "all" ? regions : regions.filter(r => r.id === filterRegion)).map(region => {
              const regionBranches = filtered.filter(b => b.region_id === region.id);
              if (!regionBranches.length) return null;
              return (
                <div key={region.id} className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${regionColor[region.id] || regionColor.default}`}>{region.name}</span>
                    <span className="text-xs text-slate-400">{regionBranches.length} สาขา</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regionBranches.map(b => (
                      <BranchCard key={b.id} branch={b} regionName={region.name}
                        onEdit={(b) => setModal(b)}
                        onDelete={(id) => setDeleteTarget(branches.find(x => x.id === id))}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : null}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">🏢</p>
              <p className="font-semibold">ไม่พบสาขา</p>
              <p className="text-sm mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มสาขาใหม่</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <BranchModal
          branch={modal === "add" ? null : modal}
          regions={regions}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          branch={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Toasts toasts={toasts} />
    </>
  );
}
