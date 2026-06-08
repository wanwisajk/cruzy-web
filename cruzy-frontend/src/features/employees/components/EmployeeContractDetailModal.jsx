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
      <div className="surface-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="caption-bold uppercase tracking-wide text-emerald-700">
              รายละเอียดสัญญาจ้าง
            </div>
            <h2 className="mt-1 heading-3 text-gray-900">
              {contract.label || "สัญญาจ้าง"}
            </h2>
            <p className="mt-1 caption text-gray-400">
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
                className="btn btn-secondary btn-sm"
              >
                เปิดไฟล์อีกหน้า
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onEdit(contract)}
              className="btn btn-secondary btn-sm"
            >
              แก้ไข
            </button>
            <button
              type="button"
              onClick={() => onDelete(contract)}
              className="btn btn-danger btn-sm"
            >
              ลบ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              ปิด
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 overflow-y-auto lg:grid-cols-[280px_1fr]">
          <div className="space-y-3 border-b border-gray-100 bg-gray-50/60 p-5 lg:border-b-0 lg:border-r">
            <InfoBlock label="พนักงาน">
              <div className="body-strong text-gray-900">{employee?.name || contract.empId}</div>
              <div className="caption text-gray-400">{employee?.nickname || employee?.position || "-"}</div>
            </InfoBlock>
            <InfoBlock label="ประเภท">
              <div className="body-strong text-gray-900">{statusLabel(contract.type)}</div>
            </InfoBlock>
            <InfoBlock label="ช่วงสัญญา">
              <div className="body-strong text-gray-900">
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
                      className="btn btn-success btn-sm justify-start"
                    >
                      {file.fileName || `ไฟล์สัญญา ${index + 1}`}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="caption text-gray-400">ยังไม่มีไฟล์ PDF</div>
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
                <div className="flex h-full min-h-[500px] items-center justify-center body-strong text-gray-400">
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
    <div className="section-card-soft">
      <div className="mb-1 caption-bold text-gray-400">{label}</div>
      {children}
    </div>
  );
}
