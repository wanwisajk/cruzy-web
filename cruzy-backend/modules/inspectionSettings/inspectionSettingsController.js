const { fetchOptionalTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanPayload(body) {
  return {
    branch_id: parseInteger(body.branchId ?? body.branch_id),
    cctv_count: body.cctvCount !== undefined || body.cctv_count !== undefined ? parseInteger(body.cctvCount ?? body.cctv_count) : 0,
    shelf_count: body.shelfCount !== undefined || body.shelf_count !== undefined ? parseInteger(body.shelfCount ?? body.shelf_count) : 0,
    required_photos: Array.isArray(body.requiredPhotos) ? body.requiredPhotos : body.required_photos || [],
    checklists: Array.isArray(body.checklists) ? body.checklists : body.checklists || [],
    required_products: Array.isArray(body.requiredProducts) ? body.requiredProducts : body.required_products || [],
    updated_at: new Date().toISOString()
  };
}

exports.listSettings = async (_req, res) => {
  try {
    res.json(await fetchOptionalTable(TABLES.inspectionSettings));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลการตั้งค่าตรวจได้');
  }
};

exports.upsertSetting = async (req, res) => {
  try {
    const payload = cleanPayload(req.body);
    if (!required(res, payload, ['branch_id'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branch_id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.inspectionSettings).upsert([payload], { onConflict: 'branch_id' }).select().single();
    if (error) throw error;
    res.json({ message: 'บันทึกการตั้งค่าตรวจสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกการตั้งค่าตรวจได้');
  }
};
