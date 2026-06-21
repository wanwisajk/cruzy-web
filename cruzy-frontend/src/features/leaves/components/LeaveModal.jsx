import { useEffect, useState } from 'react';

const defaultTypes = ['ลาประจำปี', 'ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาอื่นๆ'];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

export function LeaveModal({ open, onClose, onSave, employees, leave, saving, leaveTypeOptions = [] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [error, setError] = useState('');

  const mergedLeaveTypes = [...new Set([...defaultTypes, ...leaveTypeOptions.filter(Boolean)])];

  useEffect(() => {
    if (!leave) {
      setEmployeeId('');
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      setError('');
      return;
    }
    setEmployeeId(leave.employee_id || '');
    setLeaveType(leave.leave_type || '');
    setStartDate(leave.start_date || '');
    setEndDate(leave.end_date || '');
    setReason(leave.reason || '');
    setAttachment(null);
    setError('');
  }, [leave, open]);

  useEffect(() => {
    if (!attachment || !attachment.type.startsWith('image/')) {
      setAttachmentPreview('');
      return undefined;
    }

    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  function handleClose() {
    if (saving) return;
    onClose();
  }

  const isReadOnly = Boolean(leave && ['approved', 'rejected'].includes(leave.status));

  async function handleSubmit() {
    if (isReadOnly) return;
    if (!employeeId || !leaveType.trim() || !startDate || !endDate || !reason.trim()) {
      setError('กรุณากรอกข้อมูลทุกช่องที่จำเป็น');
      return;
    }
    if (endDate < startDate) {
      setError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }
    setError('');
    let attachments = [];
    if (attachment) {
      const fileUrl = await readFileAsDataUrl(attachment);
      attachments = [{
        fileUrl,
        fileName: attachment.name,
        fileType: attachment.type
      }];
    }
    await onSave({
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1),
      reason: reason.trim(),
      attachments
    });
  }

  const imageAttachments = leave?.attachments?.filter((file) => {
    if (file.fileType?.startsWith('image/')) return true;
    if (file.fileUrl?.startsWith('data:image/')) return true;
    return Boolean(file.fileUrl?.match(/\.(jpe?g|png|gif|webp|svg)(?:[?#].*)?$/i));
  }) || [];
  const otherAttachments = leave?.attachments?.filter((file) => !imageAttachments.includes(file)) || [];

  return (
    <div className={`overlay ${open ? 'open' : ''}`} onClick={(event) => event.target === event.currentTarget && handleClose()}>
      <div className="modal">
        <div className="m-head">
          <h2>{leave ? 'แก้ไขคำขอลา' : '+ ขอวันลา'}</h2>
          <button type="button" className="m-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="m-body space-y-4">
          {leave ? (
            <div className="section-card-soft body-text text-slate-700">
              <div className="body-strong">ข้อมูลคำขอ</div>
              <div>สถานะปัจจุบัน: {leave.status || 'รอดำเนินการ'}</div>
              {isReadOnly ? (
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 body-text text-orange-800">
                  คำขอนี้ได้รับการ{leave.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว ไม่สามารถแก้ไขได้
                </div>
              ) : null}
              <div>รหัสคำขอ: {leave.id}</div>
              {imageAttachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="body-strong">ภาพแนบ</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {imageAttachments.map((file) => (
                      <button type="button" key={file.id} onClick={() => setPreviewImageUrl(file.fileUrl)} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-cruzy hover:bg-cruzy-50 focus:outline-none">
                        <img src={file.fileUrl} alt="image attachment" className="h-36 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {otherAttachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="body-strong">ไฟล์แนบ</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {otherAttachments.map((file) => (
                      <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-2 caption text-slate-700 transition hover:border-cruzy hover:bg-cruzy-50">
                        <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-slate-500">ดูไฟล์</div>
                        <div className="mt-2 caption text-slate-600">{file.fileName || file.fileUrl}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 body-strong text-slate-700">
              พนักงาน
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input" disabled={isReadOnly}>
                <option value="">เลือกพนักงาน</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 body-strong text-slate-700">
              ประเภทการลา
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="input" disabled={isReadOnly}>
                <option value="">เลือกประเภทการลา</option>
                {mergedLeaveTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 body-strong text-slate-700">
              วันที่เริ่ม
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" disabled={isReadOnly} />
            </label>
            <label className="space-y-2 body-strong text-slate-700">
              วันที่สิ้นสุด
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" disabled={isReadOnly} />
            </label>
          </div>

          <label className="space-y-2 body-strong text-slate-700">
            เหตุผล
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="4" className="input" disabled={isReadOnly}></textarea>
          </label>

          {!isReadOnly ? (
            <label className="space-y-2 body-strong text-slate-700">
              รูปแนบ (Optional)
              <input type="file" accept="image/*" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="input" />
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="preview" className="mt-2 h-36 w-full rounded-xl object-cover border border-slate-200" />
              ) : attachment ? (
                <div className="caption text-slate-500">ไฟล์เลือกแล้ว: {attachment.name}</div>
              ) : (
                <div className="caption text-slate-400">รูปจะถูกบันทึกพร้อมคำขอลา</div>
              )}
            </label>
          ) : null}

          {error ? <div className="alert-bar warn"><span>{error}</span></div> : null}
        </div>
        <div className="m-foot">
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={saving}>{isReadOnly ? 'ปิด' : 'ยกเลิก'}</button>
          {!isReadOnly ? (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          ) : null}
        </div>
      </div>
      {previewImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImageUrl('')}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-slate-900/80 px-3 py-2 body-text text-white">ปิด</button>
          <img src={previewImageUrl} alt="full preview" className="max-h-[90vh] max-w-full rounded-xl border border-slate-200 shadow-2xl" />
        </div>
      ) : null}
    </div>
  );
}

