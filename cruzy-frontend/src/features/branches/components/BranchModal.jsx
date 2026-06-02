import { useState } from 'react';
import { DAYS, DAY_LABELS, EMPTY_BRANCH } from '../hooks/useBranches';

const steps = ['ข้อมูลสาขา', 'จำนวนพนักงาน', 'เวลาทำการ'];
const presets = [
  { label: '10:00–21:00', open: '10:00', close: '21:00' },
  { label: '09:00–21:00', open: '09:00', close: '21:00' },
  { label: '10:00–22:00', open: '10:00', close: '22:00' }
];

export function BranchModal({ branch, regions, onClose, onSave }) {
  const [form, setForm] = useState(() => branch ? { ...branch } : { ...EMPTY_BRANCH });
  const [step, setStep] = useState(0);
  const isNew = !branch;
  const valid = form.name.trim() && form.code.trim() && form.region_id;

  const set = (key, val) => setForm((current) => ({ ...current, [key]: val }));
  const setHour = (type, day, val) => setForm((current) => ({ ...current, [type]: { ...current[type], [day]: val } }));
  const applyPreset = (preset) => {
    const hours = {};
    const hoursEnd = {};
    DAYS.forEach((day) => {
      hours[day] = preset.open;
      hoursEnd[day] = preset.close;
    });
    setForm((current) => ({ ...current, hours, hoursEnd }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              {isNew ? '➕ เพิ่มสาขาใหม่' : `✏️ แก้ไข ${form.code}`}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex gap-1">
            {steps.map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${step === index ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {step === 0 ? <BranchIdentityStep form={form} regions={regions} set={set} /> : null}
          {step === 1 ? <BranchStaffStep form={form} set={set} /> : null}
          {step === 2 ? <BranchHoursStep form={form} setHour={setHour} applyPreset={applyPreset} /> : null}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            {step > 0 ? (
              <button onClick={() => setStep((current) => current - 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                ← ก่อนหน้า
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
            {step < 2 ? (
              <button onClick={() => setStep((current) => current + 1)} disabled={step === 0 && !valid} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ถัดไป →
              </button>
            ) : (
              <button onClick={() => onSave(form)} disabled={!valid} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                💾 บันทึก
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchIdentityStep({ form, regions, set }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">ชื่อสาขา <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="เช่น Central Chiang Rai" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">รหัสสาขา <span className="text-red-400">*</span></label>
          <input value={form.code} onChange={(event) => set('code', event.target.value.toUpperCase().slice(0, 4))} placeholder="CCR" maxLength={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">ภูมิภาค <span className="text-red-400">*</span></label>
          <select value={form.region_id} onChange={(event) => set('region_id', event.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition bg-white">
            <option value="">เลือกภูมิภาค</option>
            {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </div>
      </div>
      {form.code && form.name ? (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <span className="text-emerald-700 font-bold text-sm">{form.code}</span>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">{form.name}</p>
            <p className="text-xs text-emerald-600">{regions.find((region) => region.id === form.region_id)?.name}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BranchStaffStep({ form, set }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700">
        💡 กำหนดจำนวนพนักงานขั้นต่ำที่ต้องมีในแต่ละประเภทวัน
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StaffInput label="วันธรรมดา" keyName="minWeekday" sub="จันทร์–ศุกร์" tone="emerald" value={form.minWeekday} set={set} />
        <StaffInput label="วันหยุด" keyName="minWeekend" sub="เสาร์–อาทิตย์" tone="amber" value={form.minWeekend} set={set} />
      </div>
    </div>
  );
}

function StaffInput({ label, keyName, sub, tone, value, set }) {
  const styles = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 text-emerald-500 focus:ring-emerald-400 border-emerald-200',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 text-amber-500 focus:ring-amber-400 border-amber-200'
  };

  return (
    <div className="text-center">
      <div className={`p-4 rounded-2xl border-2 ${styles[tone]}`}>
        <p className={`text-xs font-bold mb-1 ${tone === 'amber' ? 'text-amber-700' : 'text-emerald-700'}`}>{label}</p>
        <p className={`text-[10px] mb-3 ${tone === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>{sub}</p>
        <input type="number" min="1" value={value ?? ''} onChange={(event) => set(keyName, Number(event.target.value))} className={`w-full text-center text-2xl font-bold bg-white border rounded-xl py-2 focus:outline-none focus:ring-2 transition ${tone === 'amber' ? 'focus:ring-amber-400 border-amber-200' : 'focus:ring-emerald-400 border-emerald-200'}`} />
        <p className="text-[10px] text-slate-400 mt-1">คน</p>
      </div>
    </div>
  );
}

function BranchHoursStep({ form, setHour, applyPreset }) {
  return (
    <div className="space-y-3">
      <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700">
        ⏰ กำหนดเวลาเปิด–ปิดแต่ละวันในสัปดาห์
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <button key={preset.label} onClick={() => applyPreset(preset)} className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 font-semibold transition-colors">
            {preset.label} (ทุกวัน)
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-3 bg-slate-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-slate-500">วัน</p>
          <p className="text-xs font-semibold text-slate-500 text-center">เปิด</p>
          <p className="text-xs font-semibold text-slate-500 text-center">ปิด</p>
        </div>
        {DAYS.map((day, index) => <BranchHourRow key={day} day={day} index={index} form={form} setHour={setHour} />)}
      </div>
    </div>
  );
}

function BranchHourRow({ day, index, form, setHour }) {
  const isWeekend = day === 'ส' || day === 'อา';

  return (
    <div className={`grid grid-cols-3 items-center px-4 py-2 gap-2 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${isWeekend ? 'bg-amber-50/40' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isWeekend ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{day}</span>
        <span className="text-xs text-slate-500 hidden sm:block">{DAY_LABELS[day]}</span>
      </div>
      <input type="time" value={form.hours?.[day] || '10:00'} onChange={(event) => setHour('hours', day, event.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center" />
      <input type="time" value={form.hoursEnd?.[day] || '21:00'} onChange={(event) => setHour('hoursEnd', day, event.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center" />
    </div>
  );
}
