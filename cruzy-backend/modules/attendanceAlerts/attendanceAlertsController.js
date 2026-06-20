const { supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanAlertPayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined ? parseInteger(body.branchId ?? body.branch_id) : undefined;
  return {
    alert_type: body.alertType || body.alert_type,
    employee_id: body.employeeId || body.employee_id,
    branch_id: branchId,
    work_date: body.workDate || body.work_date,
    alert_time: body.alertTime || body.alert_time || null,
    title: body.title,
    detail: body.detail || null,
    severity: body.severity || 'warning',
    is_acknowledged: body.isAcknowledged === undefined ? Boolean(body.is_acknowledged || false) : Boolean(body.isAcknowledged)
  };
}

exports.listAlerts = async (req, res) => {
  try {
    const fromDate = req.query.from || req.query.from_date;
    const toDate = req.query.to || req.query.to_date;
    let query = supabase.from(TABLES.attendanceAlerts).select('*');
    if (fromDate) query = query.gte('work_date', fromDate);
    if (toDate) query = query.lte('work_date', toDate);
    query = query
      .order('is_acknowledged', { ascending: true })
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลแจ้งเตือนได้');
  }
};

exports.getAlert = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendanceAlerts).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลแจ้งเตือนได้');
  }
};

exports.createAlert = async (req, res) => {
  try {
    const payload = cleanAlertPayload(req.body);
    if (!required(res, payload, ['alert_type', 'employee_id', 'branch_id', 'work_date', 'title'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendanceAlerts).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มแจ้งเตือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มแจ้งเตือนได้');
  }
};

exports.updateAlert = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanAlertPayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendanceAlerts).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตแจ้งเตือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตแจ้งเตือนได้');
  }
};

exports.acknowledgeAlert = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.attendanceAlerts).update({ is_acknowledged: true }).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'รับทราบแจ้งเตือนแล้ว', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถรับทราบแจ้งเตือนได้');
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.attendanceAlerts).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบแจ้งเตือนสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบแจ้งเตือนได้');
  }
};
