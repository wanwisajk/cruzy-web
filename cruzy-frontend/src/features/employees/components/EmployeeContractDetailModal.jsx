import { statusLabel, thDate } from "../lib/employeePageUtils";

export function EmployeeContractDetailModal({
  contract,
  employee,
  fileUrl,
  files,
  onClose,
  onDelete,
  onEdit,
}) {
  if (!contract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-2xs font-bold uppercase tracking-wide text-emerald-700">
              รายละเอียดสัญญาจ้าง
            </div>
            <h2 className="mt-1 text-base font-bold text-gray-900">
              {contract.label || "สัญญาจ้าง"}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {employee?.name || contract.empId} · {statusLabel(contract.type)} ·{" "}
              {thDate(contract.start)} ถึง {thDate(contract.end)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
              >
                เปิดไฟล์อีกหน้า
              </a>
            ) : null}
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200"
            >
              ปิด
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 overflow-y-auto lg:grid-cols-[280px_1fr]">
          <div className="space-y-3 border-b border-gray-100 bg-gray-50/60 p-5 lg:border-b-0 lg:border-r">
            <InfoBlock label="พนักงาน">
              <div className="text-sm font-bold text-gray-900">{employee?.name || contract.empId}</div>
              <div className="text-xs text-gray-400">{employee?.nickname || employee?.position || "-"}</div>
            </InfoBlock>
            <InfoBlock label="ประเภท">
              <div className="text-sm font-bold text-gray-900">{statusLabel(contract.type)}</div>
            </InfoBlock>
            <InfoBlock label="ช่วงสัญญา">
              <div className="text-sm font-bold text-gray-900">
                {thDate(contract.start)} - {thDate(contract.end)}
              </div>
            </InfoBlock>
            <InfoBlock label="ไฟล์แนบ">
              {files.length ? (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <a
                      key={file.id || `${file.fileUrl}_${index}`}
                      href={file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      {file.fileName || `ไฟล์สัญญา ${index + 1}`}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">ยังไม่มีไฟล์ PDF</div>
              )}
            </InfoBlock>
          </div>

          <div className="min-h-[520px] bg-gray-100 p-5">
            <div className="h-full min-h-[500px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-inner">
              {fileUrl ? (
                <iframe
                  title={`contract-detail-${contract.id}`}
                  src={fileUrl}
                  className="h-full min-h-[500px] w-full bg-white"
                />
              ) : (
                <div className="flex h-full min-h-[500px] items-center justify-center text-sm font-semibold text-gray-400">
                  ไม่มีไฟล์ PDF ให้ preview
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ children, label }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="mb-1 text-2xs font-bold text-gray-400">{label}</div>
      {children}
    </div>
  );
}
