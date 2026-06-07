import { nf, payCycleLabel, payTypeLabel } from "../lib/employeePageUtils";

const PAY_CYCLE_OPTIONS = [
  { id: "weekly", label: "สรุปรายอาทิตย์" },
  { id: "bimonthly", label: "สรุปครึ่งเดือน" },
  { id: "monthly", label: "สรุปรายเดือน" },
];

export function EmployeePayrollTab({
  payCycleFilter,
  payrollPeriod,
  payrollPeriodDays,
  payrollRows,
  onPayCycleChange,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xl font-semibold text-gray-700">
            รายการคำนวณรอบจ่ายปัจจุบัน
          </span>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {payrollPeriod.label} · ช่วงวันที่ {payrollPeriodDays[0] || "-"} ถึง{" "}
            {payrollPeriodDays.at(-1) || "-"}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAY_CYCLE_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPayCycleChange(item.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                payCycleFilter === item.id
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-emerald-500 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 font-semibold uppercase text-gray-400">
                <th className="px-3 py-2.5">พนักงาน</th>
                <th className="px-3 py-2.5">ประเภท</th>
                <th className="px-3 py-2.5 text-right">วันทำงาน</th>
                <th className="px-3 py-2.5">ค่าจ้างพื้นฐาน</th>
                <th className="px-3 py-2.5">ค่าคอมฯ</th>
                <th className="px-3 py-2.5">เบี้ยพิเศษ</th>
                <th className="px-3 py-2.5">หักสาย</th>
                <th className="px-3 py-2.5">หัก ปกส.</th>
                <th className="px-3 py-2.5 text-right">สุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {payrollRows.map((row) => (
                <EmployeePayrollRow key={row.id} row={row} />
              ))}
              {payrollRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                    ไม่มีข้อมูลเงินเดือนในตัวกรองนี้
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeePayrollRow({ row }) {
  return (
    <tr className="hover:bg-gray-50/30">
      <td className="px-3 py-2.5 font-semibold text-gray-900">
        {row.name} ({row.nickname || ""})
      </td>
      <td className="px-3 py-2.5 text-gray-500">
        {payCycleLabel(row.payCycle)}
        <div className="text-[10px] text-gray-400">{payTypeLabel(row.payType)}</div>
      </td>
      <td className="px-3 py-2.5 text-right">
        {row.payType === "monthly" ? "-" : nf(row.workDays)}
      </td>
      <td className="px-3 py-2.5">฿{nf(row.baseWage)}</td>
      <td className="px-3 py-2.5 text-emerald-600">
        +฿{nf(row.comm)}
        <div className="text-[10px] text-gray-400">
          {row.commissionTypeLabel} · {row.commissionDays} วัน
        </div>
      </td>
      <td className="px-3 py-2.5 text-blue-600">+฿{nf(row.allowance)}</td>
      <td className="px-3 py-2.5 text-red-500">
        -฿{nf(row.lateDeduct)}
        <div className="text-[10px] text-gray-400">
          {row.lateCount} ครั้ง · {row.lateMinutes} นาที
        </div>
      </td>
      <td className="px-3 py-2.5 text-gray-400">-฿{nf(row.sso)}</td>
      <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-700">
        ฿{nf(row.net)}
      </td>
    </tr>
  );
}
