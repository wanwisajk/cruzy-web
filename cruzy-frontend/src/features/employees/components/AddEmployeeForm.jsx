import React, { useState, useEffect, useCallback, useRef } from "react";
import { ClipboardList } from "lucide-react";

const COLORS = [
  "#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#E91E63",
  "#00BCD4", "#795548", "#607D8B", "#FF5722", "#8BC34A",
  "#3F51B5", "#009688", "#F44336", "#FFC107", "#673AB7",
];

const COMMISSION_TYPES = [
  {
    value: "scheduled_assigned_branch_days",
    label: "เลือกสาขาเอง แล้วคิดเฉพาะวันที่ทำงานในสาขานั้น"
  },
  {
    value: "actual_work_days_all_branches",
    label: "ทุกสาขาที่ไปทำงานจริงตามตารางงาน/เข้างาน"
  },
  {
    value: "period_days_responsible_branches",
    label: "ทุกวันในงวดของสาขาที่รับผิดชอบดูแล"
  }
];

const INITIAL = {
  id: "",
  color: "#4CAF50",
  name: "",
  nickname: "",
  pos: "พนักงานขาย",
  selectedBranches: [],
  commissionBranches: [],
  phone: "",
  lineUserId: "",
  empType: "fulltime",
  start: new Date().toISOString().slice(0, 10),
  payType: "monthly",
  payCycle: "monthly",
  wage: "",
  comType: "scheduled_assigned_branch_days",
  comPct: "",
  weeklyOffs: ["0"],
  holidays: "วันหยุดนักขัตฤกษ์",
  breakHours: "1",
  allowance: "",
  socialSecurityEnabled: true,
  socialSecurityAmount: "0",
  absDeduct: "system_hourly_avg",
  absFixed: "",
};

function sameId(a, b) {
  return String(a) === String(b);
}

function getInitialFormState(employee = {}, branches = []) {
  if (!employee || Object.keys(employee).length === 0) {
    return {
      ...INITIAL,
      selectedBranches: branches[0] ? [branches[0].id] : [],
      commissionBranches: branches[0] ? [branches[0].id] : []
    };
  }

  const branchEligibility = employee.branchEligibility || [];
  const branchIds = branchEligibility.map((row) => String(row.branchId || row.branch_id)).filter(Boolean);
  const selectedBranches = branchIds.length ? branchIds : employee.branch ? [employee.branch] : (branches[0] ? [branches[0].id] : []);
  const commissionBranchIds = branchEligibility
    .filter((row) => row.commissionEligible !== false && row.commission_eligible !== false)
    .map((row) => row.branchId || row.branch_id)
    .filter(Boolean);
  const commissionBranches = employee.commissionBranches?.length
    ? employee.commissionBranches.map(String)
    : commissionBranchIds.length
      ? commissionBranchIds
      : selectedBranches;
  const payProfile = employee.payProfile || {};
  const rawAbsenceMode = payProfile.absence_deduct_mode || payProfile.absDeduct || payProfile.absenceDeductMode;
  const rawAbsenceUnit = payProfile.absence_deduct_unit || payProfile.absenceDeductUnit;
  let absDeduct = "system_hourly_avg";
  let absFixed = "";

  if (rawAbsenceMode === "system") {
    const calc = payProfile.absence_system_calc || payProfile.absenceSystemCalc;
    if (calc === "hourly_fixed") absDeduct = "system_hourly_fixed";
  } else if (rawAbsenceMode === "fixed") {
    if (rawAbsenceUnit === "minute") absDeduct = "fixed_per_minute";
    else if (rawAbsenceUnit === "occurrence") absDeduct = "fixed_per_occurrence";
    else absDeduct = "fixed_per_day";
  } else if (rawAbsenceMode === "system_hourly_fixed") {
    absDeduct = "system_hourly_fixed";
  } else if (rawAbsenceMode === "fixed_per_day") {
    absDeduct = "fixed_per_day";
  } else if (rawAbsenceMode === "fixed_per_minute") {
    absDeduct = "fixed_per_minute";
  } else if (rawAbsenceMode === "fixed_per_occurrence") {
    absDeduct = "fixed_per_occurrence";
  }

  if (absDeduct !== "system_hourly_avg") {
    absFixed = String(payProfile.absence_deduct_value ?? "");
  }

  // แกะรายชื่อวันหยุดประจำสัปดาห์จาก availabilityRules
  let weeklyOffs = ["0"];
  if (Array.isArray(employee.availabilityRules) && employee.availabilityRules.length) {
    weeklyOffs = employee.availabilityRules
      .filter(r => ["off", "day_off"].includes(r.availabilityType || r.type))
      .map(r => String(r.dayOfWeek));
  } else if (Array.isArray(employee.weeklyOffs)) {
    weeklyOffs = employee.weeklyOffs;
  }

  const storedPayType = payProfile.payType || payProfile.pay_type || "monthly";
  const formPayType = storedPayType === "daily" ? "daily_shift" : storedPayType;
  const wageValue = storedPayType === "daily"
    ? (payProfile.daily_rate ?? payProfile.dailyRate ?? employee.dailyRate ?? employee.salary ?? "")
    : (payProfile.salary ?? payProfile.monthly_salary ?? payProfile.monthlySalary ?? employee.salary ?? "");
  const breakHoursValue = payProfile.breakHours ?? payProfile.break_hours ?? employee.breakHours ?? employee.break_hours ?? "1";

  return {
    id: employee.id || "",
    color: employee.color || "#4CAF50",
    name: employee.name || "",
    nickname: employee.nickname || "",
    pos: employee.position || employee.pos || "พนักงานขาย",
    selectedBranches,
    commissionBranches,
    phone: employee.phone || "",
    lineUserId: employee.line_user_id || employee.lineUserId || "",
    empType: employee.empType || "fulltime",
    start: payProfile.effectiveFrom || payProfile.effective_from || employee.startDate || new Date().toISOString().slice(0, 10),
    payType: formPayType,
    payCycle: payProfile.payCycle || payProfile.pay_cycle || "monthly",
    wage: String(wageValue),
    comType: employee.comType || employee.commissionCalcType || payProfile.commissionCalcType || payProfile.commission_calc_type || "scheduled_assigned_branch_days",
    comPct: String(payProfile.commission_rate ?? payProfile.commissionRate ?? employee.commissionRate ?? ""),
    weeklyOffs,
    holidays: employee.holidays || "วันหยุดนักขัตฤกษ์",
    breakHours: String(breakHoursValue),
    allowance: String(payProfile.special_allowance ?? ""),
    socialSecurityEnabled: payProfile.socialSecurityEnabled ?? payProfile.social_security_enabled ?? employee.socialSecurityEnabled ?? employee.social_security_enabled ?? true,
    socialSecurityAmount: String(payProfile.social_security_amount ?? payProfile.socialSecurityAmount ?? employee.socialSecurityAmount ?? employee.social_security_amount ?? 0),
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
    const normalizedBranchId = String(branchId);
    setForm((f) => {
      const selected = f.selectedBranches.some((id) => sameId(id, normalizedBranchId));
      const updatedBranches = selected
        ? f.selectedBranches.filter((id) => !sameId(id, normalizedBranchId))
        : [...f.selectedBranches, normalizedBranchId];
      const updatedCommissionBranches = selected
        ? f.commissionBranches.filter((id) => !sameId(id, normalizedBranchId))
        : f.commissionBranches.some((id) => sameId(id, normalizedBranchId))
          ? f.commissionBranches
          : [...f.commissionBranches, normalizedBranchId];
      
      if (updatedBranches.length && errors.selectedBranches) {
        setErrors((errs) => ({ ...errs, selectedBranches: false }));
      }
      return { ...f, selectedBranches: updatedBranches, commissionBranches: updatedCommissionBranches };
    });
  };

  const toggleCommissionBranchSelection = (branchId) => () => {
    const normalizedBranchId = String(branchId);
    setForm((f) => {
      const selected = f.commissionBranches.some((id) => sameId(id, normalizedBranchId));
      const updatedBranches = selected
        ? f.commissionBranches.filter((id) => !sameId(id, normalizedBranchId))
        : [...f.commissionBranches, normalizedBranchId];

      if (updatedBranches.length && errors.commissionBranches) {
        setErrors((errs) => ({ ...errs, commissionBranches: false }));
      }
      return { ...f, commissionBranches: updatedBranches };
    });
  };

  const selectAllBranches = () => {
    const branchIds = branches.map((branch) => String(branch.id));
    setForm((f) => ({
      ...f,
      selectedBranches: branchIds,
      commissionBranches: Array.from(new Set([...f.commissionBranches.map(String), ...branchIds])),
    }));
    setErrors((errs) => ({ ...errs, selectedBranches: false }));
  };

  const clearBranchSelection = () => {
    setForm((f) => ({ ...f, selectedBranches: [], commissionBranches: [] }));
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
    if (!form.name.trim()) e.name = true;
    if (!form.nickname.trim()) e.nickname = true;
    if (!form.wage || Number(form.wage) <= 0) e.wage = true;
    if (!form.comPct || Number(form.comPct) <= 0) e.comPct = true;
    if (form.comType !== "actual_work_days_all_branches" && !form.commissionBranches.length) {
      e.commissionBranches = true;
      showToast("⚠️ กรุณาเลือกสาขาที่ได้ค่าคอม", true);
    }
    if (!form.selectedBranches.length) {
      e.selectedBranches = true;
      showToast("⚠️ กรุณาเลือกอย่างน้อยหนึ่งสาขาในแบบฟอร์ม", true);
    }
    
    setErrors(e);

    if (Object.keys(e).length) {
      showToast("⚠️ กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน", true);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);

    try {
      const payTypeMap = { monthly: "monthly", daily: "daily", daily_shift: "daily", daily_full: "daily" };
      const selectedBranchIds = form.selectedBranches.length ? form.selectedBranches.map(String) : [];
      const commissionBranchIds = form.comType === "actual_work_days_all_branches"
        ? selectedBranchIds
        : form.commissionBranches.map(String).filter((branchId) => selectedBranchIds.some((id) => sameId(id, branchId)));
      const selectedBranchObj = branches.find(b => sameId(b.id, selectedBranchIds[0]));
      const calculatedRegion = selectedBranchObj?.region_id || selectedBranchObj?.region || "default";
      const employeeId = isEdit ? form.id : "";

      let absenceDeductMode = "system";
      let absenceSystemCalc = "hourly_avg";
      let absenceDeductUnit = null;
      let absenceDeductValue = null;

      if (form.absDeduct === "system_hourly_avg") {
        absenceDeductMode = "system";
        absenceSystemCalc = "hourly_avg";
        absenceDeductValue = null;
      } else if (form.absDeduct === "system_hourly_fixed") {
        absenceDeductMode = "system";
        absenceSystemCalc = "hourly_fixed";
        absenceDeductUnit = "hour";
        absenceDeductValue = Number(form.absFixed) || 0;
      } else if (form.absDeduct === "fixed_per_day") {
        absenceDeductMode = "fixed";
        absenceSystemCalc = null;
        absenceDeductUnit = "day";
        absenceDeductValue = Number(form.absFixed) || 0;
      } else if (form.absDeduct === "fixed_per_minute") {
        absenceDeductMode = "fixed";
        absenceSystemCalc = null;
        absenceDeductUnit = "minute";
        absenceDeductValue = Number(form.absFixed) || 0;
      } else if (form.absDeduct === "fixed_per_occurrence") {
        absenceDeductMode = "fixed";
        absenceSystemCalc = null;
        absenceDeductUnit = "occurrence";
        absenceDeductValue = Number(form.absFixed) || 0;
      }

      const payload = {
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
          commissionEnabled: true,
          commission_enabled: true,
          commissionCalcType: form.comType,
          commission_calc_type: form.comType,
          commission_rate: Number(form.comPct) || 0,
          special_allowance: Number(form.allowance) || 0,
          socialSecurityEnabled: Boolean(form.socialSecurityEnabled),
          social_security_enabled: Boolean(form.socialSecurityEnabled),
          socialSecurityAmount: Number(form.socialSecurityAmount) || 0,
          social_security_amount: Number(form.socialSecurityAmount) || 0,
          breakHours: Number(form.breakHours) || 1,
          break_hours: Number(form.breakHours) || 1,
          effectiveFrom: form.start,
          effective_from: form.start,
          isActive: true,
          is_active: true,

          absence_deduct_mode: absenceDeductMode,
          absence_system_calc: absenceSystemCalc,
          absence_deduct_unit: absenceDeductUnit,
          absence_deduct_value: absenceDeductValue,
          absDeduct: form.absDeduct,
          absenceDeductMode,
          absenceSystemCalc,
          absenceDeductUnit,
          absenceDeductValue
        },

        branchEligibility: selectedBranchIds.map((branchId, index) => ({
          branchId,
          branch_id: branchId,
          canWork: true,
          isPreferred: index === 0,
          priority: index === 0 ? 1 : 0,
          commissionEligible: commissionBranchIds.some((id) => sameId(id, branchId))
        })),
        availabilityRules: (function() {
          const mapping = { 'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัส': 4, 'ศุกร์': 5, 'เสาร์': 6, 'อาทิตย์': 0 };
          const selected = Array.isArray(form.weeklyOffs) && form.weeklyOffs.length ? form.weeklyOffs : ["0"];
          return selected.map((d) => {
            const day = Number.isFinite(Number(d)) ? Number(d) : (mapping[d] ?? 0);
            return { dayOfWeek: day, availabilityType: "day_off", note: "วันหยุดประจำสัปดาห์คงที่" };
          });
        })(),
        availabilityOverrides: [],
        annualRemaining: 13,
        vacationRemaining: 5
      };

      return await onSubmit?.(payload);
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
        selectedBranches: branches[0] ? [branches[0].id] : [],
        commissionBranches: branches[0] ? [branches[0].id] : []
      });
      setErrors({});
      showToast("🔄 ล้างฟอร์มแล้ว");
    }
  }

  const absFixedDisabled = form.absDeduct === "system_hourly_avg";
  const lateDeductUnitLabel = {
    system_hourly_avg: "ระบบคำนวณจากเงินเดือนและชั่วโมงงาน",
    system_hourly_fixed: "บาทต่อชั่วโมง",
    fixed_per_minute: "บาทต่อนาที",
    fixed_per_occurrence: "บาทต่อครั้ง",
    fixed_per_day: "บาทต่อวัน"
  }[form.absDeduct] || "บาท";

  const inputBaseStyle = "w-full border rounded-lg p-2.5 bg-white text-slate-800 transition-all outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 text-xs shadow-sm placeholder:text-slate-400";
  const labelBaseStyle = "mb-1 flex items-end min-h-[40px] text-xs font-medium text-slate-600";

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
        <div>
          <span className="font-bold">คำแนะนำระบบบัญชี:</span> ข้อมูลเงินเดือนฐาน อัตราหักการมาสาย และโควตาวันหยุด จะถูกกระจายไปบันทึกแยกตารางในระบบอัตโนมัติตามเงื่อนไขทางบัญชี
        </div>
      </div>

      {/* SECTION 1: ข้อมูลพื้นฐานในระบบ */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="text-emerald-800 font-bold border-b border-slate-100 pb-2.5 text-sm flex items-center gap-2">
          <ClipboardList size={16}/> 
          ข้อมูลพื้นฐานในระบบ {isEdit && <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md font-medium">กำลังแก้ไขข้อมูล</span>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500">
                เลือกได้หลายสาขา ระบบจะอนุญาตให้ลงตารางทุกสาขาที่เลือกไว้
              </p>
              <div className="flex gap-1.5">
                <button type="button" onClick={selectAllBranches} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100">
                  เลือกทุกสาขา
                </button>
                <button type="button" onClick={clearBranchSelection} className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100 hover:bg-slate-100">
                  ล้าง
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-lg bg-white border ${errors.selectedBranches ? "border-red-300" : "border-slate-100"}`}>
              {branches.map((b) => {
                const isChecked = form.selectedBranches.some((id) => sameId(id, b.id));
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
          สัญญาจ้างและรูปแบบงาน
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
          รูปแบบรายได้และข้อบังคับทางการเงิน
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          <div className="flex flex-col h-full"> 
            <label className={labelBaseStyle}>วิธีจ่ายค่าจ้าง</label>
            <select value={form.payType} onChange={set("payType")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="monthly">รายเดือน (ฐานเงินเดือน)</option>
              <option value="daily_shift">รายวัน (คิดเงินต่อกะงาน)</option>
              <option value="daily_full">รายวัน (เหมาเต็มวัน)</option>
            </select>
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>รอบการตัดบัญชีสรุปจ่าย</label>
            <select value={form.payCycle} onChange={set("payCycle")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="monthly">รายเดือน (จ่ายสิ้นเดือน)</option>
              <option value="bimonthly">จ่ายปักษ์ (ทุกวันที่ 1 และ 16)</option>
              <option value="weekly">รายสัปดาห์</option>
            </select>
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>จำนวนเงินค่าจ้างฐาน (฿) <span className="text-red-500">*</span></label>
            <input type="number" value={form.wage} onChange={set("wage")} placeholder="15000" className={`${inputBaseStyle} ${errors.wage ? "border-red-400 bg-red-50/20" : "border-slate-200"}`} />
          </div>

          <div className="lg:col-span-2">
            <label className={labelBaseStyle}>สรุปประเภทค่าคอมมิชชัน</label>
            <select value={form.comType} onChange={set("comType")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              {COMMISSION_TYPES.map((type, index) => (
                <option key={type.value} value={type.value}>{index + 1}. {type.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>ได้ค่าคอม (%)</label>
            <input type="number" value={form.comPct} onChange={set("comPct")} placeholder="2" className={`${inputBaseStyle} ${errors.comPct ? "border-red-400 bg-red-50/20" : "border-slate-200"}`} />
            {errors.comPct && <p className="text-red-500 text-[10px] mt-1">ต้องระบุเปอร์เซ็นต์ค่าคอมมากกว่า 0</p>}
          </div>

          {form.comType !== "actual_work_days_all_branches" && (
            <div className="lg:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <label className={`${labelBaseStyle} text-slate-700 font-bold`}>
                {form.comType === "period_days_responsible_branches" ? "สาขาที่รับผิดชอบดูแลและได้ค่าคอม" : "สาขาที่ได้ค่าคอม"} <span className="text-red-500">*</span>
              </label>
              <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-lg bg-white border ${errors.commissionBranches ? "border-red-300" : "border-slate-100"}`}>
                {branches.filter((branch) => form.selectedBranches.some((id) => sameId(id, branch.id))).map((b) => {
                  const isChecked = form.commissionBranches.some((id) => sameId(id, b.id));
                  return (
                    <label key={b.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 ${isChecked ? "bg-emerald-50/40 border-emerald-200 text-emerald-900" : "border-slate-100 text-slate-600"}`}>
                      <input
                        type="checkbox"
                        value={b.id}
                        checked={isChecked}
                        onChange={toggleCommissionBranchSelection(b.id)}
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
              {errors.commissionBranches && <p className="text-red-500 text-[10px]">ต้องเลือกอย่างน้อย 1 สาขาที่ได้ค่าคอม</p>}
            </div>
          )}

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>เบี้ยเลี้ยงพิเศษอื่น ๆ (฿/เดือน)</label>
            <input type="number" value={form.allowance} onChange={set("allowance")} placeholder="0" className={`${inputBaseStyle} border-slate-200`} />
          </div>

          <div className="flex flex-col h-full mt-10">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.socialSecurityEnabled)}
                onChange={(event) => setForm((current) => ({ ...current, socialSecurityEnabled: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600">มีประกันสังคม</span>
            </label>
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>หักประกันสังคม (฿)</label>
            <input
              type="number"
              min="0"
              value={form.socialSecurityAmount}
              onChange={set("socialSecurityAmount")}
              disabled={!form.socialSecurityEnabled}
              placeholder="0"
              className={`${inputBaseStyle} border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100`}
            />
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>การหักเงินมาสาย</label>
            <select value={form.absDeduct} onChange={set("absDeduct")} className={`${inputBaseStyle} border-slate-200 cursor-pointer`}>
              <option value="system_hourly_avg">คำนวณอัตโนมัติ (เรทเฉลี่ยชั่วโมงจริง)</option>
              <option value="system_hourly_fixed">หักคงที่คำนวณรายชั่วโมง</option>
              <option value="fixed_per_minute">หักคงที่ต่อนาที</option>
              <option value="fixed_per_occurrence">หักคงที่ต่อครั้ง</option>
              <option value="fixed_per_day">หักเรทเหมารายวัน</option>
            </select>
          </div>

          <div className="flex flex-col h-full">
            <label className={labelBaseStyle}>เรทหักเงินมาสาย ({lateDeductUnitLabel})</label>
            <input type="number" min="0" value={form.absFixed} onChange={set("absFixed")} disabled={absFixedDisabled} placeholder="ระบุจำนวนเงิน" className={`${inputBaseStyle} border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100`} />
          </div>

          <div className="flex flex-col h-full">
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
          className="w-full sm:w-auto order-3 sm:order-1 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 font-semibold text-slate-500 active:scale-95 transition-all text-xs"
        >
          {isEdit ? "คืนค่าข้อมูลเดิม" : "ล้างฟอร์ม"}
        </button>
        
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={loading} 
            className="w-full sm:w-auto order-2 sm:order-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 font-semibold text-slate-500 active:scale-95 transition-all text-xs"
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
          {loading ? "กำลังบันทึกข้อมูล..." : isEdit ? "อัปเดตข้อมูลพนักงาน" : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
