const { fetchOptionalTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanPayload(body) {
  return {
    inspection_id: parseInteger(body.inspectionId ?? body.inspection_id),
    user_name: body.userName || body.user_name,
    action: body.action,
    description: body.description,
    source: body.source
  };
}

exports.listLogs = async (_req, res) => {
  try {
    const { data, error } = await supabase.from(TABLES.inspectionLogs).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงประวัติ Log ได้');
  }
};

exports.createLog = async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    if (!required(res, payload, ['inspection_id', 'user_name', 'action', 'description', 'source'])) return;
    if (payload.inspection_id === null) return res.status(400).json({ message: 'inspection_id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.inspectionLogs).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึก Log สำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึก Log ได้');
  }
};
