const { fetchTable, supabase } = require('../../shared/db');
const { auditFields, parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function hasValue(body, ...keys) {
  return keys.some((key) => body[key] !== undefined);
}

function firstValue(body, ...keys) {
  const key = keys.find((item) => body[item] !== undefined);
  return key ? body[key] : undefined;
}

function cleanLeavePayload(body, { partial = false } = {}) {
  const payload = {};

  if (hasValue(body, 'employeeId', 'employee_id')) payload.employee_id = firstValue(body, 'employeeId', 'employee_id');
  if (hasValue(body, 'leaveType', 'leave_type')) payload.leave_type = firstValue(body, 'leaveType', 'leave_type');
  if (hasValue(body, 'startDate', 'start_date')) payload.start_date = firstValue(body, 'startDate', 'start_date');
  if (hasValue(body, 'endDate', 'end_date')) payload.end_date = firstValue(body, 'endDate', 'end_date');
  if (hasValue(body, 'daysCount', 'days_count')) payload.days_count = toNumber(firstValue(body, 'daysCount', 'days_count'), 1);
  if (hasValue(body, 'reason')) payload.reason = body.reason || null;
  if (hasValue(body, 'status')) payload.status = body.status;

  if (!partial && !payload.status) payload.status = 'pending';
  return payload;
}

function cleanAttachmentPayload(leaveId, attachment) {
  return {
    entity_type: 'leave',
    entity_id: leaveId,
    file_url: attachment.fileUrl || attachment.file_url || attachment.url || attachment.dataUrl || attachment.data_url
  };
}

function inferFileTypeFromUrl(fileUrl) {
  if (!fileUrl) return null;
  const dataTypeMatch = String(fileUrl).match(/^data:([^;]+);/);
  if (dataTypeMatch) return dataTypeMatch[1];
  const extMatch = String(fileUrl).match(/\.(jpeg|jpg|png|gif|webp|svg)(?:[?#].*)?$/i);
  if (!extMatch) return null;
  const extension = extMatch[1].toLowerCase();
  return extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
}

function mapAttachment(row) {
  const fileUrl = row.file_url;
  return {
    id: String(row.id),
    entityType: row.entity_type,
    entityId: String(row.entity_id),
    fileUrl,
    fileType: row.file_type || inferFileTypeFromUrl(fileUrl),
    createdAt: row.created_at || null
  };
}

async function fetchLeaveAttachments(leaveIds) {
  if (!leaveIds.length) return [];
  const { data, error } = await supabase
    .from(TABLES.attachments)
    .select('*')
    .eq('entity_type', 'leave')
    .in('entity_id', leaveIds);
  if (error) throw error;
  return data || [];
}

function attachFiles(leaves, attachments) {
  const byLeave = new Map();
  attachments.forEach((file) => {
    const key = String(file.entity_id);
    if (!byLeave.has(key)) byLeave.set(key, []);
    byLeave.get(key).push(mapAttachment(file));
  });
  return leaves.map((leave) => ({
    ...leave,
    attachments: byLeave.get(String(leave.id)) || []
  }));
}

async function insertLeaveAttachments(leaveId, attachments) {
  const rows = (Array.isArray(attachments) ? attachments : [])
    .map((attachment) => cleanAttachmentPayload(leaveId, attachment))
    .filter((attachment) => attachment.file_url);

  if (!rows.length) return [];
  const { data, error } = await supabase.from(TABLES.attachments).insert(rows).select();
  if (error) throw error;
  return data || [];
}

exports.listLeaves = async (_req, res) => {
  try {
    const leaves = await fetchTable(TABLES.leaves);
    const attachments = await fetchLeaveAttachments(leaves.map((leave) => leave.id));
    res.json(attachFiles(leaves, attachments));
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
    const attachments = await fetchLeaveAttachments([id]);
    res.json(attachFiles([data], attachments)[0]);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลการลาได้');
  }
};

exports.createLeave = async (req, res) => {
  try {
    const payload = { ...cleanLeavePayload(req.body), ...auditFields(req) };
    if (!required(res, payload, ['employee_id', 'leave_type', 'start_date', 'end_date'])) return;
    const { data, error } = await supabase.from(TABLES.leaves).insert([payload]).select().single();
    if (error) throw error;
    const attachments = await insertLeaveAttachments(data.id, req.body.attachments);
    res.status(201).json({ message: 'เพิ่มรายการลาสำเร็จ', data: { ...data, attachments: attachments.map(mapAttachment) } });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มรายการลาได้');
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = { ...cleanLeavePayload(req.body, { partial: true }), ...auditFields(req) };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const { data, error } = await supabase.from(TABLES.leaves).update(payload).eq('id', id).select().single();
    if (error) throw error;
    await insertLeaveAttachments(id, req.body.attachments);
    const attachments = await fetchLeaveAttachments([id]);
    res.json({ message: 'อัปเดตรายการลาสำเร็จ', data: attachFiles([data], attachments)[0] });
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
    const { data, error } = await supabase.from(TABLES.leaves).update({ status, ...auditFields(req) }).eq('id', id).select().single();
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
    await supabase.from(TABLES.attachments).delete().eq('entity_type', 'leave').eq('entity_id', id);
    await supabase.from(TABLES.leaves).update(auditFields(req)).eq('id', id);
    const { error } = await supabase.from(TABLES.leaves).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบรายการลาสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบรายการลาได้');
  }
};
