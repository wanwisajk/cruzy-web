import { numberTH } from '../../../lib/date';

const EMP_TYPE_LABELS = {
  fulltime: 'เต็มเวลา (Fulltime)',
  parttime: 'Part-time',
  freelance: 'Freelance'
};

const PAY_TYPE_LABELS = {
  monthly: 'รายเดือน',
  daily: 'รายวัน'
};

const PAY_CYCLE_LABELS = {
  monthly: 'รายเดือน',
  bimonthly: 'จ่ายปักษ์',
  weekly: 'รายสัปดาห์'
};

const COMMISSION_TYPE_LABELS = {
  scheduled_assigned_branch_days: 'เลือกสาขาเอง แล้วคิดเฉพาะวันที่ทำงานในสาขานั้น',
  actual_work_days_all_branches: 'ทุกสาขาที่ไปทำงานจริงตามตารางงาน/เข้างาน',
  period_days_responsible_branches: 'ทุกวันในงวดของสาขาที่รับผิดชอบดูแล'
};

const DAY_LABELS = {
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัส',
  5: 'ศุกร์',
  6: 'เสาร์',
  0: 'อาทิตย์'
};

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function money(value, suffix = '') {
  return `฿${numberTH(Number(value || 0))}${suffix}`;
}

function branchName(branches, id) {
  const branch = branches.find((item) => String(item.id) === String(id));
  return branch ? `${branch.code || branch.id} - ${branch.name}` : valueOrDash(id);
}

function getPayProfile(employee) {
  return employee.payProfile || {};
}

function getWage(employee) {
  const pay = getPayProfile(employee);
  if ((pay.payType || pay.pay_type || employee.payType) === 'daily') {
    return pay.daily_rate ?? pay.dailyRate ?? employee.dailyRate ?? employee.salary ?? 0;
  }
  return pay.monthly_salary ?? pay.monthlySalary ?? employee.monthlySalary ?? employee.salary ?? 0;
}

function selectedBranches(employee) {
  const branchEligibility = employee.branchEligibility || [];
  if (branchEligibility.length) {
    return branchEligibility.map((row) => row.branchId || row.branch_id).filter(Boolean);
  }
  return [employee.branch].filter(Boolean);
}

function commissionBranches(employee) {
  const branchEligibility = employee.branchEligibility || [];
  const fromRules = branchEligibility
    .filter((row) => row.commissionEligible !== false && row.commission_eligible !== false)
    .map((row) => row.branchId || row.branch_id)
    .filter(Boolean);
  return employee.commissionBranches?.length ? employee.commissionBranches : fromRules;
}

function weeklyOffs(employee) {
  const rules = employee.availabilityRules || [];
  const days = rules
    .filter((rule) => (rule.availabilityType || rule.type) === 'off')
    .map((rule) => String(rule.dayOfWeek));
  return days.length ? days : employee.weeklyOffs || [];
}

function lateDeductLabel(employee) {
  const pay = getPayProfile(employee);
  const mode = pay.absence_deduct_mode || pay.absenceDeductMode || employee.absenceDeductMode;
  const calc = pay.absence_system_calc || pay.absenceSystemCalc || employee.absenceSystemCalc;
  const unit = pay.absence_deduct_unit || pay.absenceDeductUnit || employee.absenceDeductUnit;
  const amount = pay.absence_deduct_value ?? pay.absenceDeductValue ?? employee.absenceDeductValue;

  if (mode === 'system' && calc === 'hourly_fixed') return `${money(amount)} / ชั่วโมง`;
  if (mode === 'system') return 'คำนวณอัตโนมัติจากเรทเฉลี่ยชั่วโมงจริง';
  if (unit === 'minute') return `${money(amount)} / นาที`;
  if (unit === 'occurrence') return `${money(amount)} / ครั้ง`;
  if (unit === 'hour') return `${money(amount)} / ชั่วโมง`;
  if (unit === 'day') return `${money(amount)} / วัน`;
  return amount === undefined || amount === null ? '-' : money(amount);
}

export function EmployeeViewModal({ employee, branches, onClose }) {
  const pay = getPayProfile(employee);
  const payType = pay.payType || pay.pay_type || employee.payType || 'monthly';
  const payCycle = pay.payCycle || pay.pay_cycle || employee.payCycle || 'monthly';
  const branchIds = selectedBranches(employee);
  const commissionBranchIds = commissionBranches(employee);
  const offDays = weeklyOffs(employee);
  const socialSecurityEnabled = pay.socialSecurityEnabled ?? pay.social_security_enabled ?? employee.socialSecurityEnabled ?? true;
  const socialSecurityAmount = pay.socialSecurityAmount ?? pay.social_security_amount ?? employee.socialSecurityAmount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-all">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ดูข้อมูลพนักงาน</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{employee.name || '-'} · {employee.id || '-'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-74px)]">
          <Section title="ข้อมูลพื้นฐาน">
            <Info label="รหัสพนักงาน" value={employee.id} />
            <Info label="ชื่อ - นามสกุล" value={employee.name} />
            <Info label="ชื่อเล่น" value={employee.nickname} />
            <Info label="ตำแหน่ง" value={employee.position || employee.pos} />
            <Info label="เบอร์โทรศัพท์" value={employee.phone} />
            <Info label="LINE User ID" value={employee.line_user_id || employee.lineUserId} />
          </Section>

          <Section title="สาขาและรูปแบบงาน">
            <Info label="ประเภทการว่าจ้าง" value={EMP_TYPE_LABELS[employee.empType] || employee.empType} />
            <Info label="วันเริ่มงาน" value={pay.effectiveFrom || pay.effective_from || employee.startDate} />
            <Info label="สาขาหลัก" value={branchName(branches, branchIds[0] || employee.branch)} />
            <Info label="สาขาที่ทำงานได้" value={branchIds.map((id) => branchName(branches, id)).join(', ')} />
            <Info label="วันหยุดประจำสัปดาห์" value={offDays.map((day) => DAY_LABELS[day] || day).join(', ')} />
            <Info label="สีบนตารางงาน" value={<ColorValue color={employee.color} />} />
          </Section>

          <Section title="รายได้และการจ่ายเงิน">
            <Info label="วิธีจ่ายค่าจ้าง" value={PAY_TYPE_LABELS[payType] || payType} />
            <Info label="รอบการจ่าย" value={PAY_CYCLE_LABELS[payCycle] || payCycle} />
            <Info label="ค่าจ้างฐาน" value={money(getWage(employee), payType === 'daily' ? ' / วัน' : ' / เดือน')} />
            <Info label="ประเภทค่าคอม" value={COMMISSION_TYPE_LABELS[pay.commissionCalcType || pay.commission_calc_type || employee.commissionCalcType] || '-'} />
            <Info label="ค่าคอม" value={`${numberTH(Number(pay.commission_rate ?? pay.commissionRate ?? employee.commissionRate ?? 0))}%`} />
            <Info label="สาขาที่ได้ค่าคอม" value={commissionBranchIds.map((id) => branchName(branches, id)).join(', ')} />
            <Info label="เบี้ยเลี้ยงพิเศษ" value={money(pay.special_allowance ?? pay.specialAllowance ?? employee.specialAllowance ?? 0, ' / เดือน')} />
          </Section>

          <Section title="ข้อบังคับทางการเงิน">
            <Info label="ประกันสังคม" value={socialSecurityEnabled ? 'มีประกันสังคม' : 'ไม่มีประกันสังคม'} />
            <Info label="หักประกันสังคม" value={money(socialSecurityAmount)} />
            <Info label="การหักเงินมาสาย" value={lateDeductLabel(employee)} />
            <Info label="เวลาพักมาตรฐาน" value={`${numberTH(Number(pay.breakHours ?? pay.break_hours ?? employee.breakHours ?? 1))} ชั่วโมง / วัน`} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h4 className="mb-3 text-xs font-bold text-emerald-800">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 min-h-[76px]">
      <div className="text-slate-500 text-[11px] mb-2">{label}</div>
      <div className="font-semibold text-slate-800 break-words">{valueOrDash(value)}</div>
    </div>
  );
}

function ColorValue({ color }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: color || '#4CAF50' }} />
      <span>{color || '#4CAF50'}</span>
    </span>
  );
}
