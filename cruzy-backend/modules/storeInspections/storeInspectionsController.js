const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanInspectionPayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined ? parseInteger(body.branchId ?? body.branch_id) : undefined;
  return {
    branch_id: branchId,
    work_date: body.workDate || body.work_date,
    submitted_by: body.submittedBy || body.submitted_by || null,
    submit_time: body.submitTime || body.submit_time,
    status: body.status || 'pass',
    inspection_items: body.inspectionItems || body.inspection_items,
    reviewed_by: body.reviewedBy || body.reviewed_by || null,
    review_time: body.reviewTime || body.review_time || null,
    manager_note: body.managerNote || body.manager_note || null
  };
}

exports.listInspections = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.storeInspections));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลตรวจร้านได้');
  }
};

exports.getInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลตรวจร้านได้');
  }
};

exports.saveInspection = async (req, res) => {
  try {
    const payload = cleanInspectionPayload(req.body);
    if (!required(res, payload, ['branch_id', 'work_date', 'submit_time', 'inspection_items'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกตรวจร้านสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกตรวจร้านได้');
  }
};

exports.updateInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanInspectionPayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตตรวจร้านสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตตรวจร้านได้');
  }
};

exports.deleteInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.storeInspections).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบข้อมูลตรวจร้านสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบข้อมูลตรวจร้านได้');
  }
};
