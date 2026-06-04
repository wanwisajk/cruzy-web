import { useEffect, useState } from 'react';

const defaultTypes = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาอื่นๆ'];

export function LeaveModal({ open, onClose, onSave, employees, leave, saving, leaveTypeOptions = [] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);
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

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSubmit() {
    if (!employeeId || !leaveType.trim() || !startDate || !endDate || !reason.trim()) {
      setError('กรุณากรอกข้อมูลทุกช่องที่จำเป็น');
      return;
    }
    if (endDate < startDate) {
      setError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม');
      return;
    }
    setError('');
    await onSave({
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1),
      reason: reason.trim()
    });
  }

  return (
    <div className={`overlay ${open ? 'open' : ''}`} onClick={(event) => event.target === event.currentTarget && handleClose()}>
      <div className="modal">
        <div className="m-head">
          <h2>{leave ? 'แก้ไขคำขอลา' : '+ ขอวันลา'}</h2>
          <button type="button" className="m-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="m-body space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              พนักงาน
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
                <option value="">เลือกพนักงาน</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              ประเภทการลา
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="input">
                <option value="">เลือกประเภทการลา</option>
                {mergedLeaveTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              วันที่เริ่ม
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              วันที่สิ้นสุด
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </label>
          </div>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            เหตุผล
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="4" className="input"></textarea>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Attachment (Optional)
            <input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="input" />
            {attachment ? <div className="text-xs text-slate-500">ไฟล์เลือกแล้ว: {attachment.name}</div> : <div className="text-xs text-slate-400">ไฟล์จะไม่ถูกอัพโหลดอัตโนมัติในเวอร์ชันนี้</div>}
          </label>

          {error ? <div className="alert-bar warn"><span>{error}</span></div> : null}
        </div>
        <div className="m-foot">
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={saving}>ยกเลิก</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  );
}
