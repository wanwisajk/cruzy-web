const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanAttendancePayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined
    ? parseInteger(body.branchId ?? body.branch_id)
    : undefined;
  return {
    employee_id: body.employeeId || body.employee_id,
    branch_id: branchId,
    work_date: body.workDate || body.work_date,
    clock_in: body.clockIn || body.clock_in || null,
    clock_out: body.clockOut || body.clock_out || null,
    late_minutes: body.lateMinutes !== undefined || body.late_minutes !== undefined ? toNumber(body.lateMinutes ?? body.late_minutes, 0) : undefined,
    break_start: body.breakStart || body.break_start || null,
    break_end: body.breakEnd || body.break_end || null,
    break_minutes: body.breakMinutes !== undefined || body.break_minutes !== undefined ? toNumber(body.breakMinutes ?? body.break_minutes, 0) : undefined,
    is_break_over: body.isBreakOver === undefined ? body.is_break_over : Boolean(body.isBreakOver)
  };
}

exports.listAttendance = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.attendance));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลเข้างานได้');
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendance).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลเข้างานได้');
  }
};

exports.createAttendance = async (req, res) => {
  try {
    const payload = cleanAttendancePayload(req.body);
    if (!required(res, payload, ['employee_id', 'branch_id', 'work_date'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    if (payload.late_minutes === undefined) payload.late_minutes = 0;
    if (payload.break_minutes === undefined) payload.break_minutes = 0;
    if (payload.is_break_over === undefined) payload.is_break_over = false;
    const { data, error } = await supabase.from(TABLES.attendance).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มข้อมูลเข้างานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มข้อมูลเข้างานได้');
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanAttendancePayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendance).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตข้อมูลเข้างานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตข้อมูลเข้างานได้');
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.attendance).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบข้อมูลเข้างานสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบข้อมูลเข้างานได้');
  }
};
