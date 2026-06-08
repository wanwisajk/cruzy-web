import { X } from 'lucide-react';
import { numberTH } from '../../../lib/date';
import { COMMISSION_TYPE_DETAIL_LABELS } from '../lib/employeePageUtils';

const EMP_TYPE_LABELS = {
  fulltime: 'เต็มเวลา (Fulltime)',
  parttime: 'Part-time',
  freelance: 'Freelance'
};

const PAY_TYPE_LABELS = {
  monthly: 'รายเดือน',
  daily: 'รายวัน',
  daily_shift: 'รายวัน (คิดเงินต่อกะงาน)',
  daily_full: 'รายวัน (เหมาเต็มวัน)'
};

const PAY_CYCLE_LABELS = {
  monthly: 'รายเดือน',
  bimonthly: 'จ่ายปักษ์',
  weekly: 'รายสัปดาห์'
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
  const payType = pay.payType || pay.pay_type || employee.payType;
  if (payType === 'daily' || payType === 'daily_shift' || payType === 'daily_full') {
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
    <div className="overlay open" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal w-[1024px]">
        <div className="m-head">
          <div>
            <h2>ดูข้อมูลพนักงาน</h2>
            <p className="caption text-slate-100 mt-0.5">{employee.name || '-'} · {employee.id || '-'}</p>
          </div>
          <button type="button" className="m-close" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>

        <div className="m-body">
          <div className="space-y-5">
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
              <Info label="ประเภทค่าคอม" value={COMMISSION_TYPE_DETAIL_LABELS[pay.commissionCalcType || pay.commission_calc_type || employee.commissionCalcType] || '-'} />
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
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h4 className="mb-3 caption-bold text-emerald-800">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 min-h-[76px]">
      <div className="text-slate-500 caption mb-2">{label}</div>
      <div className="body-strong text-slate-800 break-words">{valueOrDash(value)}</div>
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
