const { fetchOptionalTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanAttachmentPayload(body) {
  return {
    entity_type: body.entityType || body.entity_type,
    entity_id: parseInteger(body.entityId ?? body.entity_id),
    file_url: body.fileUrl || body.file_url
  };
}

exports.listAttachments = async (_req, res) => {
  try {
    res.json(await fetchOptionalTable(TABLES.attachments));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงไฟล์แนบได้');
  }
};

exports.createAttachment = async (req, res) => {
  try {
    const payload = cleanAttachmentPayload(req.body);
    if (!required(res, payload, ['entity_type', 'entity_id', 'file_url'])) return;
    if (payload.entity_id === null) return res.status(400).json({ message: 'entityId ต้องเป็นตัวเลข' });

    const { data, error } = await supabase.from(TABLES.attachments).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มไฟล์แนบสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มไฟล์แนบได้');
  }
};

exports.createAttachments = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.attachments) ? req.body.attachments.map(cleanAttachmentPayload) : [];
    if (!rows.length) return res.status(400).json({ message: 'ต้องมีไฟล์แนบอย่างน้อย 1 รายการ' });
    if (rows.some((row) => !row.entity_type || row.entity_id === null || !row.file_url)) {
      return res.status(400).json({ message: 'ข้อมูลไฟล์แนบไม่ครบถ้วน' });
    }

    const { data, error } = await supabase.from(TABLES.attachments).insert(rows).select();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มไฟล์แนบสำเร็จ', data: data || [] });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มไฟล์แนบได้');
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.attachments).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบไฟล์แนบสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบไฟล์แนบได้');
  }
};
