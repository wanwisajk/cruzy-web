import { Button } from "../../../components/ui/Button";
import { EmployeeStatCard } from "./EmployeeStatCard";
import { statusColor, statusLabel, thDate } from "../lib/employeePageUtils";

const EMPLOYEE_STATUS_FILTERS = ["all", "fulltime", "parttime", "freelance"];

export function EmployeeInfoTab({
  branches = [],
  counts,
  employees,
  filterStatus,
  onCreate,
  onDelete,
  onEdit,
  onFilterStatus,
  onSearch,
  onView,
  search,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EmployeeStatCard label="ทั้งหมด" value={counts.all} accent="green" />
        <EmployeeStatCard label="Full time" value={counts.fulltime} accent="teal" />
        <EmployeeStatCard label="Part time" value={counts.parttime} accent="amber" />
        <EmployeeStatCard label="Freelance" value={counts.freelance} accent="blue" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:w-full sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-3 pr-8 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex shrink-0 justify-end">
            <Button variant="primary" size="sm" onClick={onCreate}>
              + เพิ่มพนักงาน
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 justify-end">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {EMPLOYEE_STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onFilterStatus(status)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                  filterStatus === status
                    ? "bg-white text-emerald-700 shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {status === "all" ? "ทั้งหมด" : statusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <EmployeeInfoTable
        branches={branches}
        employees={employees}
        onDelete={onDelete}
        onEdit={onEdit}
        onView={onView}
      />
    </div>
  );
}

function EmployeeInfoTable({ branches, employees, onDelete, onEdit, onView }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-400">
              <th className="px-4 py-3">รหัส/พนักงาน</th>
              <th className="px-4 py-3">ตำแหน่ง</th>
              <th className="px-4 py-3">สาขาหลัก</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">เบอร์โทรศัพท์</th>
              <th className="px-4 py-3">เริ่มงาน</th>
              <th className="px-4 py-3">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {employees.map((employee) => (
              <EmployeeInfoRow
                key={employee.id}
                branch={branches.find((item) => String(item.id) === String(employee.branch))}
                employee={employee}
                onDelete={onDelete}
                onEdit={onEdit}
                onView={onView}
              />
            ))}
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  ไม่พบพนักงาน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeInfoRow({ branch, employee, onDelete, onEdit, onView }) {
  const employeeType = employee.empType || "fulltime";

  return (
    <tr className="transition-colors hover:bg-gray-50/40">
      <td className="px-4 py-3 font-medium text-gray-900">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: employee.color }} />
          <div>
            <div>
              {employee.name} ({employee.nickname || ""})
            </div>
            <div className="font-mono text-2xs text-gray-400">
              {employee.code || employee.id}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs">{employee.position || employee.pos || "-"}</td>
      <td className="px-4 py-3">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
          {branch?.code || "-"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold tracking-wide ${statusColor(employeeType)}`}
        >
          {statusLabel(employeeType)}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{employee.phone || "-"}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {thDate(employee.startDate || employee.start || employee.hiredAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onView(employee)}
            className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:border-emerald-500 hover:bg-emerald-100"
          >
            ดูข้อมูล
          </button>
          <button
            type="button"
            onClick={() => onEdit(employee)}
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:border-blue-500 hover:bg-blue-100"
          >
            แก้ไข
          </button>
          <button
            type="button"
            onClick={() => onDelete(employee)}
            className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:border-red-500 hover:bg-red-100"
          >
            ลบ
          </button>
        </div>
      </td>
    </tr>
  );
}
