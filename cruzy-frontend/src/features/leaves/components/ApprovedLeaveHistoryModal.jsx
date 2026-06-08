import { X } from 'lucide-react';

function isImageFile(file) {
  if (!file) return false;
  if (file.fileType?.startsWith('image/')) return true;
  if (typeof file.fileUrl === 'string' && file.fileUrl.startsWith('data:image/')) return true;
  return Boolean(String(file.fileUrl || '').match(/\.(jpe?g|png|gif|webp|svg)(?:[?#].*)?$/i));
}

export function ApprovedLeaveHistoryModal({ open, onClose, employee }) {
  if (!open || !employee) return null;

  return (
    <div className="overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal max-w-4xl rounded-xl overflow-hidden">
        <div className="m-head">
          <h2>ประวัติการลา approved ของ {employee.name}</h2>
          <button type="button" className="m-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="m-body space-y-4">
          <div className="section-card-soft body-text text-slate-700">
            <div className="body-strong">สรุป</div>
            <div className="grid grid-cols-2 gap-3 body-text text-slate-600 sm:grid-cols-4">
              <div>ประจำปี: {employee.summary.annualUsed}/{employee.summary.annualQuota}</div>
              <div>พักร้อน: {employee.summary.vacationUsed}/{employee.summary.vacationQuota}</div>
              <div>ป่วย: {employee.summary.sickUsed}</div>
              <div>กิจ: {employee.summary.personalUsed}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse body-text">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">ประเภทการลา</th>
                  <th className="px-4 py-3 text-left">วันที่เริ่ม</th>
                  <th className="px-4 py-3 text-left">วันที่สิ้นสุด</th>
                  <th className="px-4 py-3 text-left">จำนวนวัน</th>
                  <th className="px-4 py-3 text-left">เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {employee.approvedLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{leave.leave_type}</td>
                    <td className="px-4 py-3">{leave.start_date}</td>
                    <td className="px-4 py-3">{leave.end_date}</td>
                    <td className="px-4 py-3">{leave.days_count}</td>
                    <td className="px-4 py-3">{leave.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {employee.approvedLeaves.map((leave) => {
            const imageAttachments = (leave.attachments || []).filter(isImageFile);
            const otherAttachments = (leave.attachments || []).filter((file) => !isImageFile(file));
            return (
              <div key={leave.id} className="section-card-sm shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="body-text text-slate-500">คำขอ #{leave.id}</div>
                    <div className="body-strong">{leave.leave_type}</div>
                  </div>
                  <div className="body-text text-slate-500">{leave.start_date} - {leave.end_date} ({leave.days_count} วัน)</div>
                </div>
                <div className="mt-3 body-text text-slate-700">
                  <div className="body-strong">เหตุผล</div>
                  <div>{leave.reason || '-'}</div>
                </div>
                {(imageAttachments.length > 0 || otherAttachments.length > 0) && (
                  <div className="mt-4 space-y-3">
                    {imageAttachments.length > 0 && (
                      <div>
                        <div className="body-strong text-slate-700">ภาพแนบ</div>
                        <div className="grid gap-2 sm:grid-cols-2 mt-2">
                          {imageAttachments.map((file) => (
                            <div key={file.id || file.fileUrl} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              <img src={file.fileUrl} alt="attachment" className="h-36 w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {otherAttachments.length > 0 && (
                      <div>
                        <div className="body-strong text-slate-700">ไฟล์แนบ</div>
                        <div className="grid gap-2 sm:grid-cols-2 mt-2">
                          {otherAttachments.map((file) => (
                            <a key={file.id || file.fileUrl} href={file.fileUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-3 caption text-slate-700 transition hover:border-cruzy hover:bg-slate-50">
                              <div className="body-emphasis">ดูไฟล์</div>
                              <div className="mt-1 text-slate-500">{file.fileName || file.fileUrl}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

