import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";

const COLORS = [
  "#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#E91E63",
  "#00BCD4", "#795548", "#607D8B", "#FF5722", "#8BC34A",
  "#3F51B5", "#009688", "#F44336", "#FFC107", "#673AB7",
];

const INITIAL = {
  id: "",
  color: "#4CAF50",
  name: "",
  nickname: "",
  pos: "พนักงานขาย",
  selectedBranches: [],
  phone: "",
  lineUserId: "",
  empType: "fulltime",
  start: new Date().toISOString().slice(0, 10),
  payType: "monthly",
  payCycle: "monthly",
  wage: "",
  comType: "tier",
  comPct: "",
  weeklyOffs: ["0"],
  holidays: "วันหยุดนักขัตฤกษ์",
  breakHours: "1",
  allowance: "",
  absDeduct: "system_hourly_avg",
  absFixed: "",
};

function getInitialFormState(employee = {}, branches = []) {
  if (!employee || Object.keys(employee).length === 0) {
    return {
      ...INITIAL,
      selectedBranches: branches[0] ? [branches[0].id] : []
    };
  }

  const branchIds = (employee.branchEligibility || []).map((row) => row.branchId || row.branch_id).filter(Boolean);
  const selectedBranches = branchIds.length ? branchIds : employee.branch ? [employee.branch] : (branches[0] ? [branches[0].id] : []);
  const payProfile = employee.payProfile || {};
  const rawAbsenceMode = payProfile.absence_deduct_mode || payProfile.absDeduct || payProfile.absenceDeductMode;
  let absDeduct = "system_hourly_avg";
  let absFixed = "";

  if (rawAbsenceMode === "system") {
    const calc = payProfile.absence_system_calc || payProfile.absenceSystemCalc;
    if (calc === "hourly_fixed") absDeduct = "system_hourly_fixed";
  } else if (rawAbsenceMode === "fixed") {
    absDeduct = "fixed_per_day";
  } else if (rawAbsenceMode === "system_hourly_fixed") {
    absDeduct = "system_hourly_fixed";
  } else if (rawAbsenceMode === "fixed_per_day") {
    absDeduct = "fixed_per_day";
  }

  if (absDeduct !== "system_hourly_avg") {
    absFixed = String(payProfile.absence_deduct_value ?? "");
  }

  // แกะรายชื่อวันหยุดประจำสัปดาห์จาก availabilityRules
  let weeklyOffs = ["0"];
  if (Array.isArray(employee.availabilityRules) && employee.availabilityRules.length) {
    weeklyOffs = employee.availabilityRules
      .filter(r => r.availabilityType === "off")
      .map(r => String(r.dayOfWeek));
  } else if (Array.isArray(employee.weeklyOffs)) {
    weeklyOffs = employee.weeklyOffs;
  }

  return {
    id: employee.id || "",
    color: employee.color || "#4CAF50",
    name: employee.name || "",
    nickname: employee.nickname || "",
    pos: employee.position || employee.pos || "พนักงานขาย",
    selectedBranches,
    phone: employee.phone || "",
    lineUserId: employee.line_user_id || employee.lineUserId || "",
    empType: employee.empType || "fulltime",
    start: payProfile.effectiveFrom || payProfile.effective_from || employee.startDate || new Date().toISOString().slice(0, 10),
    payType: payProfile.payType || payProfile.pay_type || "monthly",
    payCycle: payProfile.payCycle || payProfile.pay_cycle || "monthly",
    wage: String(payProfile.salary ?? payProfile.monthly_salary ?? payProfile.daily_rate ?? employee.salary ?? ""),
    comType: employee.comType || (payProfile.commission_enabled ? (payProfile.commission_rate ? "flat" : "tier") : "none"),
    comPct: String(payProfile.commission_rate ?? ""),
    weeklyOffs,
    holidays: employee.holidays || "วันหยุดนักขัตฤกษ์",
    breakHours: String(payProfile.breakHours ?? payProfile.break_hours ?? "1"),
    allowance: String(payProfile.special_allowance ?? ""),
    absDeduct,
    absFixed
  };
}

export default function AddEmployeeForm({ branches = [], onSubmit, onCancel, employee, mode = 'create' }) {
  const isEdit = mode === 'edit' || !!employee?.id;
  const [form, setForm] = useState(() => getInitialFormState(employee, branches));
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ใช้ useRef บันทึกค่า ID ของพนักงานที่ถูกแก้ไข เพื่อป้องกันข้อมูลโหลดซ้ำซ้อนตอนกำลังพิมพ์
  const currentEmployeeIdRef = useRef(employee?.id);

  // 🔄 อัปเดตฟอร์มเมื่อเปลี่ยนตัวพนักงานที่จะแก้ไขจริงๆ เท่านั้น
  useEffect(() => {
    if (employee?.id !== currentEmployeeIdRef.current) {
      setForm(getInitialFormState(employee, branches));
      currentEmployeeIdRef.current = employee?.id;
    }
  }, [employee]); // เอา branches ออกจาก dependency เพื่อกันเคลียร์ฟอร์มระหว่างพิมพ์งาน

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: false }));
  };

  const showToast = useCallback((msg, error = false) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const toggleBranchSelection = (branchId) => () => {
    setForm((f) => {
      const selected = f.selectedBranches.includes(branchId);
      const updatedBranches = selected
        ? f.selectedBranches.filter((id) => id !== branchId)
        : [...f.selectedBranches, branchId];
      
      if (updatedBranches.length && errors.selectedBranches) {
        setErrors((errs) => ({ ...errs, selectedBranches: false }));
      }
      return { ...f, selectedBranches: updatedBranches };
    });
  };

  const toggleWeeklyOff = (dayValue) => () => {
    setForm((f) => {
      const list = Array.isArray(f.weeklyOffs) ? f.weeklyOffs.slice() : [];
      const idx = list.indexOf(dayValue);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(dayValue);
      return { ...f, weeklyOffs: list };
    });
  };

  function validate() {
    const e = {};
    if (!form.id.trim()) e.id = true;
    if (!form.name.trim()) e.name = true;
    if (!form.nickname.trim()) e.nickname = true;
    if (!form.wage || Number(form.wage) <= 0) e.wage = true;
    if (!form.selectedBranches.length) {
      e.selectedBranches = true;
      showToast("⚠️ กรุณาเลือกอย่างน้อยหนึ่งสาขาในแบบฟอร์ม", true);
    }
    
    setErrors(e);

    if (Object.keys(e).length) {
      if (e.id) {
        showToast("⚠️ กรุณากรอก ID พนักงาน", true);
      } else {
        showToast("⚠️ กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน", true);
      }
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);

    try {
      const payTypeMap = { monthly: "monthly", daily_shift: "daily", daily_full: "daily" };
      const selectedBranchIds = form.selectedBranches.length ? form.selectedBranches : [];
      const selectedBranchObj = branches.find(b => b.id === selectedBranchIds[0]);
      const calculatedRegion = selectedBranchObj?.region_id || selectedBranchObj?.region || "default";
      const employeeId = form.id.trim();

      let absenceDeductMode = "system";
      let absenceSystemCalc = "hourly_avg";
      let absenceDeductValue = null;

      if (form.absDeduct === "system_hourly_avg") {
        absenceDeductMode = "system";
        absenceSystemCalc = "hourly_avg";
        absenceDeductValue = null;
      } else if (form.absDeduct === "system_hourly_fixed") {
        absenceDeductMode = "system";
        absenceSystemCalc = "hourly_fixed";
        absenceDeductValue = Number(form.absFixed) || 0;
      } else if (form.absDeduct === "fixed_per_day") {
        absenceDeductMode = "fixed";
        absenceSystemCalc = null;
        absenceDeductValue = Number(form.absFixed) || 0;
      }

      const payload = {
        id: employeeId,
        name: form.name.trim(),
        color: form.color,
        position: form.pos,
        empType: form.empType,
        salary: form.payType === "monthly" ? Number(form.wage) : null,
        regionId: calculatedRegion,
        region_id: calculatedRegion,
        nickname: form.nickname.trim(),
        phone: form.phone.trim() || null,
        line_user_id: form.lineUserId || null,

        payProfile: {
          payType: payTypeMap[form.payType],
          pay_type: payTypeMap[form.payType],
          payCycle: form.payCycle,
          pay_cycle: form.payCycle,
          salary: Number(form.wage) || 0,
          monthlySalary: payTypeMap[form.payType] === "monthly" ? Number(form.wage) : 0,
          monthly_salary: payTypeMap[form.payType] === "monthly" ? Number(form.wage) : 0,
          dailyRate: payTypeMap[form.payType] === "daily" ? Number(form.wage) : 0,
          daily_rate: payTypeMap[form.payType] === "daily" ? Number(form.wage) : 0,
          commissionEnabled: form.comType !== "none",
          commission_enabled: form.comType !== "none",
          commission_rate: form.comType === "flat" ? Number(form.comPct) : null,
          special_allowance: Number(form.allowance) || 0,
          breakHours: Number(form.breakHours) || 1,
          break_hours: Number(form.breakHours) || 1,
          effectiveFrom: form.start,
          effective_from: form.start,
          isActive: true,
          is_active: true,

          absence_deduct_mode: absenceDeductMode,
          absence_deduct_value: absenceDeductValue,
          absDeduct: absenceDeductMode,
          absenceDeductMode,
          absenceDeductValue
        },

        branchEligibility: selectedBranchIds.map((branchId, index) => ({
          branchId,
          branch_id: branchId,
          canWork: true,
          isPreferred: index === 0,
          priority: index === 0 ? 1 : 0,
          commissionEligible: form.comType !== "none"
        })),
        availabilityRules: (function() {
          const mapping = { 'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัส': 4, 'ศุกร์': 5, 'เสาร์': 6, 'อาทิตย์': 0 };
          const selected = Array.isArray(form.weeklyOffs) && form.weeklyOffs.length ? form.weeklyOffs : ["0"];
          return selected.map((d) => {
            const day = Number.isFinite(Number(d)) ? Number(d) : (mapping[d] ?? 0);
            return { dayOfWeek: day, availabilityType: "off", note: "วันหยุดประจำสัปดาห์คงที่" };
          });
        })(),
        availabilityOverrides: [],
        annualRemaining: 13,
        vacationRemaining: 5
      };

      let savedEmployee;

      if (isEdit && employee?.id) {
        const result = await api.updateEmployee(employee.id, payload);
        savedEmployee = {
          ...payload,
          ...result.data,
          branchEligibility: payload.branchEligibility,
          payProfile: payload.payProfile,
          availabilityRules: payload.availabilityRules,
          availabilityOverrides: payload.availabilityOverrides
        };
        showToast(`✅ อัปเดตพนักงาน ${form.name} สำเร็จแล้ว`);
      } else {
        const result = await api.createEmployee(payload);
        savedEmployee = {
          ...payload,
          ...result.data,
          branchEligibility: payload.branchEligibility,
          payProfile: payload.payProfile,
          availabilityRules: payload.availabilityRules,
          availabilityOverrides: payload.availabilityOverrides
        };
        showToast(`✅ เพิ่มพนักงาน ${form.name} สำเร็จแล้ว`);
      }

      setTimeout(() => onSubmit?.(savedEmployee), 600);
    } catch (err) {
      showToast(`❌ เกิดข้อผิดพลาดในระบบ: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  }

  // 📝 ปรับ Logic ปุ่ม Reset: ถ้ามีข้อมูลเก่าอยู่ ให้ดึงข้อมูลเก่ามาพ่นใหม่แทนการล้างเป็นค่าว่าง
  function handleReset() {
    if (isEdit) {
      setForm(getInitialFormState(employee, branches));
      setErrors({});
      showToast("🔄 คืนค่าข้อมูลพนักงานเดิมเรียบร้อย");
    } else {
      setForm({
        ...INITIAL,
        selectedBranches: branches[0] ? [branches[0].id] : []
      });
      setErrors({});
      showToast("🔄 ล้างฟอร์มแล้ว");
    }
  }

  const comDisabled = form.comType !== "flat";
  const absFixedDisabled = form.absDeduct === "system_hourly_avg";

  const inputBaseStyle = "w-full border rounded-lg p-2.5 bg-white text-slate-800 transition-all outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 text-xs shadow-sm placeholder:text-slate-400";
  const labelBaseStyle = "block font-semibold text-slate-600 mb-1.5 flex items-center gap-1";

  return (
    <div className="text-slate-700 text-xs space-y-6 max-w-6xl mx-auto p-1 sm:p-4">
      {/* Toast Layer */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <div key={t.id} className={`p-3.5 rounded-xl text-white shadow-xl text-xs font-semibold flex items-center justify-between animate-slide-in backdrop-blur-md ${t.error ? "bg-red-50/95 text-red-600 border border-red-200" : "bg-emerald-600/95"}`}>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Info Tip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl text-blue-800 leading-relaxed shadow-sm flex items-start gap-2.5">
        <span className="text-base mt-0.5">💡</span>
        <div>
          <span className="font-bold">คำแนะนำระบบบัญชี:</span> ข้อมูลเงินเดือนฐาน อัตราหักการมาสาย และโควตาวันหยุด จะถูกกระจายไปบันทึกแยกตารางในระบบอัตโนมัติตามเงื่อนไขทางบัญชี
        </div>
      </div>

      {/* SECTION 1: ข้อมูลพื้นฐานในระบบ */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="text-emerald-800 font-bold border-b border-slate-100 pb-2.5 text-sm flex items-center gap-2">
          <span className="text-base">📋</span> ข้อมูลพื้นฐานในระบบ {isEdit && <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md font-medium">กำลังแก้ไขข้อมูล</span>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-6">
            <label className={labelBaseStyle}>รหัสพนักงาน (ID) <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.id}
              onChange={set("id")}
              disabled={isEdit}
              placeholder="เช่น emp_20240601_001"
              className={`${inputBaseStyle} ${errors.id ? "border-red-400 bg-red-50/20" : "border-slate-200"} ${isEdit ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : ""}`}
            />
            {errors.id && !isEdit && <p className="text-red-500 text-[10px] mt-1">⚠️ ต้องระบุ ID พนักงาน</p>}
          </div>

          <div className="lg:col-span-4">
            <label className={labelBaseStyle}>สีประจำตัวบนตารางงาน</label>
            <div className="flex flex-wrap gap-2 py-1.5 bg-slate-50 px-2.5 rounded-lg border border-slate-100">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  type="button" 
                  onClick={() => setForm(f => ({ ...f, color: c }))} 
                  className={`w-5 h-5 rounded-full border transition-all transform hover:scale-110 ${form.color === c ? "border-slate-800 scale-125 ring-4 ring-emerald-500/30 z-10" : "border-white shadow-sm"}`} 
                  style={{ background: c }} 
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className={labelBaseStyle}>ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={set("name")} placeholder="ชื่อจริง นามสกุล" className={`${inputBaseStyle} ${errors.name ? "border-red-400 bg-red-50/20" : "border-slate-200"}`} />
          </div>

          <div className="lg:col-span-3">
            <label className={labelBaseStyle}>ชื่อเล่น <span className="text-red-500">*</span></label>
            <input type="text" value={form.nickname} onChange={set("nickname")} placeholder="ชื่อเล่นสำหรับหน้าตารางเวร" className={`${inputBaseStyle} ${errors.nickname ? "border-red-400 bg-red-50/20" : "border-slate-200"}`} />
          </div>

          <div className="lg:col-span-2">
            <label className={labelBaseStyle}>เบอร์โทรศัพท์</label>
            <input type="tel" value={form.phone} onChange={set("phone")} placeholder="0812345678" className={`${inputBaseStyle} border-slate-200`} />
          </div>

          <div className="lg:col-span-2">
            <label className={labelBaseStyle}>ตำแหน่งงาน <span className="text-red-500">*</span></label>
            <select value={form.pos} onChange={set("pos")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="พนักงานขาย">พนักงานขาย</option>
              <option value="คนคุมสาขา">คนคุมสาขา</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className={labelBaseStyle}>LINE User ID <span className="text-[10px] text-slate-400 font-normal">(ยิงสลิป/วินัย)</span></label>
            <input type="text" value={form.lineUserId} onChange={set("lineUserId")} placeholder="Uxxxxxxxxxxxxxxxxxxxxxxx" className={`${inputBaseStyle} border-slate-200`} />
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <label className={`${labelBaseStyle} text-slate-700 font-bold`}>
              สาขาที่พนักงานประจำการ / สลับไปช่วยงานได้ <span className="text-red-500">*</span>
            </label>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-lg bg-white border ${errors.selectedBranches ? "border-red-300" : "border-slate-100"}`}>
              {branches.map((b) => {
                const isChecked = form.selectedBranches.includes(b.id);
                return (
                  <label key={b.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 ${isChecked ? "bg-emerald-50/40 border-emerald-200 text-emerald-900" : "border-slate-100 text-slate-600"}`}>
                    <input
                      type="checkbox"
                      value={b.id}
                      checked={isChecked}
                      onChange={toggleBranchSelection(b.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px]">{b.code}</span>
                      <span className="text-[10px] text-slate-500">{b.name}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.selectedBranches && <p className="text-red-500 text-[10px]">⚠️ จำเป็นต้องเลือกอย่างน้อย 1 สาขาหลัก</p>}
          </div>
        </div>
      </div>

      {/* SECTION 2: สัญญาจ้างและรูปแบบงาน */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="text-emerald-800 font-bold border-b border-slate-100 pb-2.5 text-sm flex items-center gap-2">
          <span className="text-base">💼</span> สัญญาจ้างและรูปแบบงาน
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelBaseStyle}>ประเภทการว่าจ้าง</label>
            <select value={form.empType} onChange={set("empType")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="fulltime">เต็มเวลา (Fulltime)</option>
              <option value="parttime">Part-time</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          
          <div>
            <label className={labelBaseStyle}>วันมีผลเริ่มงานตามสัญญา</label>
            <input type="date" value={form.start} onChange={set("start")} className={`${inputBaseStyle} border-slate-200`} />
          </div>

          <div>
            <label className={labelBaseStyle}>วันหยุดประจำสัปดาห์ (เลือกได้หลายวัน)</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "1", label: "จ" },
                { value: "2", label: "อ" },
                { value: "3", label: "พ" },
                { value: "4", label: "พฤ" },
                { value: "5", label: "ศ" },
                { value: "6", label: "ส" },
                { value: "0", label: "อา" },
              ].map((day) => {
                const active = Array.isArray(form.weeklyOffs) && form.weeklyOffs.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={toggleWeeklyOff(day.value)}
                    className={`flex-1 min-w-[36px] h-9 rounded-lg border text-xs font-semibold transition-all ${active ? "bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-700/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: รูปแบบรายได้และข้อบังคับทางการเงิน */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="text-emerald-800 font-bold border-b border-slate-100 pb-2.5 text-sm flex items-center gap-2">
          <span className="text-base">💰</span> รูปแบบรายได้และข้อบังคับทางการเงิน
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelBaseStyle}>วิธีจ่ายค่าจ้าง</label>
            <select value={form.payType} onChange={set("payType")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="monthly">รายเดือน (ฐานเงินเดือน)</option>
              <option value="daily_shift">รายวัน (คิดเงินต่อกะงาน)</option>
              <option value="daily_full">รายวัน (เหมาเต็มวัน)</option>
            </select>
          </div>

          <div>
            <label className={labelBaseStyle}>รอบการตัดบัญชีสรุปจ่าย</label>
            <select value={form.payCycle} onChange={set("payCycle")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="monthly">รายเดือน (จ่ายสิ้นเดือน)</option>
              <option value="bimonthly">จ่ายปักษ์ (ทุกวันที่ 1 และ 16)</option>
              <option value="weekly">รายสัปดาห์</option>
            </select>
          </div>

          <div>
            <label className={labelBaseStyle}>จำนวนเงินค่าจ้างฐาน (฿) <span className="text-red-500">*</span></label>
            <input type="number" value={form.wage} onChange={set("wage")} placeholder="15000" className={`${inputBaseStyle} ${errors.wage ? "border-red-400 bg-red-50/20" : "border-slate-200"}`} />
          </div>

          <div>
            <label className={labelBaseStyle}>ระบบคิดค่าคอมมิชชั่น</label>
            <select value={form.comType} onChange={set("comType")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="tier">Tier ตามยอดขายสาขา</option>
              <option value="flat">เรทคงที่ (%)</option>
              <option value="none">ไม่มี</option>
            </select>
          </div>

          <div>
            <label className={labelBaseStyle}>% คอมมิชชั่นคงที่</label>
            <input type="number" value={form.comPct} onChange={set("comPct")} disabled={comDisabled} placeholder="2" className={`${inputBaseStyle} border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100`} />
          </div>

          <div>
            <label className={labelBaseStyle}>เบี้ยเลี้ยงพิเศษอื่น ๆ (฿/เดือน)</label>
            <input type="number" value={form.allowance} onChange={set("allowance")} placeholder="0" className={`${inputBaseStyle} border-slate-200`} />
          </div>

          <div>
            <label className={labelBaseStyle}>ลоจิกการหักเงินมาสาย</label>
            <select value={form.absDeduct} onChange={set("absDeduct")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="system_hourly_avg">คำนวณอัตโนมัติ (เรทเฉลี่ยชั่วโมงจริง)</option>
              <option value="system_hourly_fixed">หักคงที่คำนวณรายชั่วโมง</option>
              <option value="fixed_per_day">หักเรทเหมารายวัน</option>
            </select>
          </div>

          <div>
            <label className={labelBaseStyle}>เรทหักเงินคงที่ (฿)</label>
            <input type="number" value={form.absFixed} onChange={set("absFixed")} disabled={absFixedDisabled} placeholder="ระบุจำนวนเงิน" className={`${inputBaseStyle} border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100`} />
          </div>

          <div>
            <label className={labelBaseStyle}>เวลาพักกะมาตรฐานต่อวัน</label>
            <select value={form.breakHours} onChange={set("breakHours")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="1">1 ชั่วโมง</option>
              <option value="0.5">30 นาที</option>
              <option value="1.5">1.5 ชั่วโมง</option>
            </select>
          </div>
        </div>
      </div>

      {/* BUTTONS ACTION */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-2 border-t border-slate-100 pt-5 mt-4">
        <button 
          type="button" 
          onClick={handleReset} 
          disabled={loading} 
          className="w-full sm:w-auto order-3 sm:order-1 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-500 active:scale-95 transition-all text-xs"
        >
          {isEdit ? "🔄 คืนค่าข้อมูลเดิม" : "🔄 ล้างฟอร์ม"}
        </button>
        
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={loading} 
            className="w-full sm:w-auto order-2 sm:order-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-500 active:scale-95 transition-all text-xs"
          >
            ยกเลิก
          </button>
        )}
        
        <button 
          type="button" 
          onClick={handleSubmit} 
          disabled={loading} 
          className="w-full sm:w-auto order-1 sm:order-3 px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 shadow-sm shadow-emerald-700/10 active:scale-95 disabled:bg-emerald-400 transition-all text-xs"
        >
          {loading ? "⏳ กำลังบันทึกข้อมูล..." : isEdit ? "💾 อัปเดตข้อมูลพนักงาน" : "💾 บันทึกพนักงาน"}
        </button>
      </div>
    </div>
  );
}