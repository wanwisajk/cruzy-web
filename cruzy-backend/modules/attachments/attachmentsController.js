const { fetchOptionalTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

const DOCUMENTS_BUCKET = 'documents';

function safeFileName(name = 'document.pdf') {
  const cleaned = String(name || 'document.pdf')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
  const lower = cleaned.toLowerCase();
  if (lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return cleaned;
  }
  return `${cleaned || 'document'}.pdf`;
}

function cleanAttachmentPayload(body) {
  return {
    entity_type: body.entityType || body.entity_type,
    entity_id: parseInteger(body.entityId ?? body.entity_id),
    file_url: body.fileUrl || body.file_url,
    file_name: body.fileName || body.file_name || null,
    file_type: body.fileType || body.file_type || null,
    file_size: body.fileSize === undefined && body.file_size === undefined ? null : parseInteger(body.fileSize ?? body.file_size),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {}
  };
}

function parseDataUrl(dataUrl) {
  if (!dataUrl) {
    console.log('[parseDataUrl] No dataUrl provided');
    return null;
  }
  const dataUrlStr = String(dataUrl || '');
  console.log('[parseDataUrl] Input length:', dataUrlStr.length, 'First 100 chars:', dataUrlStr.slice(0, 100));
  const match = dataUrlStr.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    console.log('[parseDataUrl] No match found');
    return null;
  }
  console.log('[parseDataUrl] ContentType:', match[1], 'DataLength:', match[2].length);
  try {
    const buffer = Buffer.from(match[2], 'base64');
    console.log('[parseDataUrl] Buffer created, size:', buffer.length);
    return {
      contentType: match[1],
      buffer
    };
  } catch (err) {
    console.log('[parseDataUrl] Buffer creation error:', err.message);
    return null;
  }
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
    const fileData = req.body.fileData || req.body.file_data;
    let fileName = req.body.fileName || req.body.file_name;
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    
    console.log('[uploadAttachment] Initial values:', { entityType, entityId, fileDataExists: !!fileData, fileName });
    
    // Ensure we have a filename
    if (!fileName) {
      const contentType = fileData?.split(';')[0]?.split(':')[1] || 'image/jpeg';
      const ext = contentType === 'image/png' ? '.png' : contentType === 'application/pdf' ? '.pdf' : '.jpg';
      fileName = `upload_${Date.now()}${ext}`;
      console.log('[uploadAttachment] Generated filename:', fileName);
    }
    
    const file = parseDataUrl(fileData);

    if (!entityType || entityId === null || !file) {
      console.log('[uploadAttachment] Validation failed:', { entityType, entityId, fileExists: !!file });
      return res.status(400).json({ message: 'ข้อมูลไฟล์แนบไม่ครบถ้วน' });
    }
    
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.contentType)) {
      console.log('[uploadAttachment] Invalid content type:', file.contentType);
      return res.status(400).json({ message: 'รองรับเฉพาะไฟล์ PDF, PNG, และ JPEG เท่านั้น' });
    }

    const safeFileName_result = safeFileName(fileName);
    const storagePath = `${entityType}/${entityId}/${Date.now()}_${safeFileName_result}`;
    console.log('[uploadAttachment] Uploading:', { storagePath, bufferSize: file.buffer.length, contentType: file.contentType });
    
const { error: uploadError } = await supabase.storage
  .from(DOCUMENTS_BUCKET)
  .upload(storagePath, file.buffer, {
    contentType: file.contentType,
    cacheControl: '3600',
    upsert: false
  });
    
    if (uploadError) {
      console.log('[uploadAttachment] Supabase upload error:', uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);
    console.log('[uploadAttachment] Got public URL:', publicData.publicUrl);
    
    const payload = {
      entity_type: entityType,
      entity_id: entityId,
      file_url: publicData.publicUrl,
      storage_bucket: DOCUMENTS_BUCKET,
      storage_path: storagePath,
      file_name: safeFileName_result,
      file_type: file.contentType,
      file_size: file.buffer.length,
      metadata
    };
    
    console.log('[uploadAttachment] Inserting to DB:', { entity_type: payload.entity_type, entity_id: payload.entity_id });
    
    const { data, error } = await supabase.from(TABLES.attachments).insert([payload]).select().single();
    if (error) {
      console.log('[uploadAttachment] Database error:', error);
      throw error;
    }

    console.log('[uploadAttachment] Success! ID:', data.id);
    
    res.status(201).json({
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        ...data,
        storage_bucket: DOCUMENTS_BUCKET,
        storage_path: storagePath
      }
    });
  } catch (error) {
    console.log('[uploadAttachment] Final error:', error.message || error);
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
