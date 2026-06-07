const { fetchOptionalTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

const DOCUMENTS_BUCKET = 'documents';

function safeFileName(name = 'document.pdf') {
  const cleaned = String(name || 'document.pdf')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned || 'document'}.pdf`;
}

function cleanAttachmentPayload(body) {
  return {
    entity_type: body.entityType || body.entity_type,
    entity_id: parseInteger(body.entityId ?? body.entity_id),
    file_url: body.fileUrl || body.file_url
  };
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

exports.listAttachments = async (req, res) => {
  try {
    const entityType = req.query.entity_type || req.query.entityType;
    const entityId = req.query.entity_id || req.query.entityId;
    if (entityType && entityId !== undefined) {
      const parsedEntityId = parseInteger(entityId);
      if (parsedEntityId === null) return res.status(400).json({ message: 'entityId ต้องเป็นตัวเลข' });
      const { data, error } = await supabase
        .from(TABLES.attachments)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', parsedEntityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }

    return res.json(await fetchOptionalTable(TABLES.attachments, '*', {
      order: { column: 'created_at', ascending: false }
    }));
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

exports.uploadAttachment = async (req, res) => {
  try {
    const entityType = req.body.entityType || req.body.entity_type;
    const entityId = parseInteger(req.body.entityId ?? req.body.entity_id);
    const file = parseDataUrl(req.body.fileData || req.body.file_data);
    const fileName = safeFileName(req.body.fileName || req.body.file_name);

    if (!entityType || entityId === null || !file) {
      return res.status(400).json({ message: 'ข้อมูลไฟล์แนบไม่ครบถ้วน' });
    }
    if (file.contentType !== 'application/pdf') {
      return res.status(400).json({ message: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' });
    }

    const storagePath = `${entityType}/${entityId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.contentType,
        upsert: false
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);
    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      file_url: publicData.publicUrl,
      storage_bucket: DOCUMENTS_BUCKET,
      storage_path: storagePath,
      file_name: fileName,
      file_type: file.contentType,
      file_size: file.buffer.length
    };
    const { data, error } = await supabase.from(TABLES.attachments).insert([payload]).select().single();
    if (error) throw error;

    res.status(201).json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        ...data,
        storage_bucket: DOCUMENTS_BUCKET,
        storage_path: storagePath
      }
    });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปโหลดไฟล์ได้');
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data: attachment, error: fetchError } = await supabase.from(TABLES.attachments).select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (attachment?.storage_bucket && attachment?.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(attachment.storage_bucket)
        .remove([attachment.storage_path]);
      if (storageError) throw storageError;
    }
    const { error } = await supabase.from(TABLES.attachments).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบไฟล์แนบสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบไฟล์แนบได้');
  }
};
