import { statusLabel, thDate } from "../lib/employeePageUtils";

const CONTRACT_FILTERS = ["all", "fulltime", "parttime", "freelance"];

export function EmployeeContractsTab({
  contractFilter,
  contractForm,
  contractRows,
  contractSaving,
  editingContractId,
  employees,
  getEmployee,
  getPrimaryFile,
  onCancelForm,
  onDelete,
  onEdit,
  onFieldChange,
  onFileChange,
  onFilterChange,
  onOpenForm,
  onSave,
  onSelect,
  showContractForm,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {CONTRACT_FILTERS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onFilterChange(type)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                contractFilter === type
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {type === "all" ? "ทั้งหมด" : statusLabel(type)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenForm}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
        >
          เพิ่มสัญญาจ้าง
        </button>
      </div>

      {showContractForm ? (
        <ContractForm
          contractForm={contractForm}
          contractSaving={contractSaving}
          editingContractId={editingContractId}
          employees={employees}
          onCancel={onCancelForm}
          onFieldChange={onFieldChange}
          onFileChange={onFileChange}
          onSave={onSave}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {contractRows.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            employee={getEmployee(contract)}
            file={getPrimaryFile(contract)}
            onDelete={onDelete}
            onEdit={onEdit}
            onSelect={onSelect}
          />
        ))}
        {contractRows.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm font-semibold text-gray-400">
            ไม่พบสัญญาจ้างในสาขา/ชุดข้อมูลนี้
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ContractForm({
  contractForm,
  contractSaving,
  editingContractId,
  employees,
  onCancel,
  onFieldChange,
  onFileChange,
  onSave,
}) {
  return (
    <form onSubmit={onSave} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {editingContractId ? "แก้ไขสัญญาจ้าง" : "เพิ่มสัญญาจ้างใหม่"}
          </h3>
          <p className="mt-0.5 text-2xs text-gray-400">
            บันทึกข้อมูลสัญญาและแนบไฟล์ PDF ไปยัง Supabase Storage
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-xs font-bold text-gray-500">
          พนักงาน
          <select
            value={contractForm.employeeId}
            onChange={onFieldChange("employeeId")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          >
            <option value="">เลือกพนักงาน</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.nickname || employee.id})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-gray-500">
          ประเภทสัญญา
          <select
            value={contractForm.contractType}
            onChange={onFieldChange("contractType")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          >
            <option value="fulltime">Full time ประจำ</option>
            <option value="parttime">Part time</option>
            <option value="freelance">Freelance</option>
          </select>
        </label>
        <label className="text-xs font-bold text-gray-500">
          วันที่เริ่ม
          <input
            type="date"
            value={contractForm.startDate}
            onChange={onFieldChange("startDate")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </label>
        <label className="text-xs font-bold text-gray-500">
          วันที่สิ้นสุด
          <input
            type="date"
            value={contractForm.endDate}
            onChange={onFieldChange("endDate")}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
          />
        </label>
        <label className="text-xs font-bold text-gray-500 md:col-span-4">
          ไฟล์สัญญา PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={onFileChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-700"
          />
          {contractForm.file ? (
            <div className="mt-1 text-2xs font-semibold text-emerald-700">
              เลือกไฟล์แล้ว: {contractForm.file.name}
            </div>
          ) : null}
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={contractSaving}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:bg-emerald-300"
        >
          {contractSaving ? "กำลังบันทึก..." : editingContractId ? "อัปเดตสัญญา" : "บันทึกสัญญา"}
        </button>
      </div>
    </form>
  );
}

function ContractCard({ contract, employee, file, onDelete, onEdit, onSelect }) {
  const fileUrl = file?.fileUrl || contract.file;

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-gray-800">{contract.label || "สัญญาจ้าง"}</h4>
          <p className="text-2xs text-gray-400">
            พนักงาน: {employee?.name || "-"} · ประเภท: {statusLabel(contract.type)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ระยะเวลา: {thDate(contract.start)} ถึง {thDate(contract.end)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-2xs font-bold ${
            fileUrl ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {fileUrl ? "มีไฟล์ PDF" : "ยังไม่มีไฟล์"}
        </span>
      </div>

      <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        {fileUrl ? (
          <iframe
            title={`contract-${contract.id}`}
            src={`${fileUrl}#toolbar=0&navpanes=0`}
            className="h-40 w-full bg-white pointer-events-none"
          />
        ) : (
          <div className="text-xs font-semibold text-gray-400">ไม่มีไฟล์ PDF สำหรับ preview</div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
          >
            เปิดไฟล์
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect(contract.id)}
          className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
        >
          ดูรายละเอียด
        </button>
        <button
          type="button"
          onClick={() => onEdit(contract)}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => onDelete(contract)}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          ลบ
        </button>
      </div>
    </div>
  );
}
