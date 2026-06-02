const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanLeavePayload(body) {
  return {
    employee_id: body.employeeId || body.employee_id,
    leave_type: body.leaveType || body.leave_type,
    start_date: body.startDate || body.start_date,
    end_date: body.endDate || body.end_date,
    days_count: toNumber(body.daysCount ?? body.days_count, 1),
    reason: body.reason || null,
    status: body.status || 'pending'
  };
}

exports.listLeaves = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.leaves));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลการลาได้');
  }
};

exports.getLeave = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.leaves).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลการลาได้');
  }
};

exports.createLeave = async (req, res) => {
  try {
    const payload = cleanLeavePayload(req.body);
    if (!required(res, payload, ['employee_id', 'leave_type', 'start_date', 'end_date'])) return;
    const { data, error } = await supabase.from(TABLES.leaves).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มรายการลาสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มรายการลาได้');
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanLeavePayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const { data, error } = await supabase.from(TABLES.leaves).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตรายการลาสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตรายการลาได้');
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.leaves).update({ status }).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตสถานะการลาเรียบร้อยแล้ว', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตสถานะการลาได้');
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.leaves).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบรายการลาสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบรายการลาได้');
  }
};
