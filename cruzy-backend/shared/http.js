function required(res, body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    res.status(400).json({ message: `ข้อมูลไม่ครบถ้วน: ${missing.join(', ')}` });
    return false;
  }
  return true;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function auditFields(req) {
  const type = req.headers['x-cruzy-actor-type'] || req.body?.auditActorType || req.body?.audit_actor_type || 'user';
  const id = req.headers['x-cruzy-actor-id'] || req.body?.auditActorId || req.body?.audit_actor_id || null;
  const name = req.headers['x-cruzy-actor-name'] || req.body?.auditActorName || req.body?.audit_actor_name || req.body?.updatedBy || req.body?.updated_by || req.body?.issuedBy || req.body?.issued_by || req.body?.assignedBy || req.body?.assigned_by || null;
  return {
    audit_actor_type: String(type || 'user'),
    audit_actor_id: id === null || id === undefined || id === '' ? null : String(id),
    audit_actor_name: name === null || name === undefined || name === '' ? 'system' : String(name)
  };
}

function isNetworkDatabaseError(error) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.cause?.message || ''} ${error?.cause?.code || ''}`;
  return /fetch failed|Connect Timeout|UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|AbortError/i.test(text);
}

function sendError(res, error, message, status = 500) {
  if (isNetworkDatabaseError(error)) {
    return res.status(503).json({
      message: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      error: error.message,
      code: error.code || 'DATABASE_NETWORK_ERROR'
    });
  }
  res.status(status).json({ message, error: error.message, code: error.code || null });
}

module.exports = {
  required,
  toNumber,
  parseInteger,
  auditFields,
  sendError
};
