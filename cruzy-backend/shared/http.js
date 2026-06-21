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

function parseBigintId(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return /^\d+$/.test(text) ? text : null;
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function actorFromRequest(req) {
  const body = req.body || {};
  const headers = req.headers || {};
  const userId = firstPresent(headers['x-cruzy-user-id'], body.userId, body.user_id);
  const username = firstPresent(headers['x-cruzy-actor-username'], headers['x-cruzy-username'], body.username, body.userName, body.user_name);
  const employeeId = firstPresent(
    headers['x-cruzy-employee-id'],
    body.actorEmployeeId,
    body.actor_employee_id,
    body.employeeId,
    body.employee_id,
    body.submittedBy,
    body.submitted_by,
    body.depositedBy,
    body.deposited_by
  );
  const lineUserId = firstPresent(headers['x-cruzy-line-user-id'], body.lineUserId, body.line_user_id);
  const explicitType = firstPresent(headers['x-cruzy-actor-type'], body.auditActorType, body.audit_actor_type);
  const explicitId = firstPresent(headers['x-cruzy-actor-id'], body.auditActorId, body.audit_actor_id);
  const explicitName = firstPresent(
    headers['x-cruzy-actor-name'],
    body.auditActorName,
    body.audit_actor_name,
    body.updatedBy,
    body.updated_by,
    body.issuedBy,
    body.issued_by,
    body.assignedBy,
    body.assigned_by,
    body.submitted_by_name,
    body.submittedByName
  );
  const type = explicitType || (lineUserId ? 'line' : employeeId ? 'employee' : (userId || username) ? 'user' : 'system');
  const id = explicitId || (type === 'line' ? lineUserId : type === 'employee' ? employeeId : userId || username || null);
  const name = explicitName || username || body.name || employeeId || lineUserId || 'system';
  return {
    type: String(type || 'system'),
    id: id === null || id === undefined || id === '' ? null : String(id),
    name: String(name || 'system'),
    userId: userId === null || userId === undefined || userId === '' ? null : String(userId),
    username: username === null || username === undefined || username === '' ? null : String(username),
    employeeId: employeeId === null || employeeId === undefined || employeeId === '' ? null : String(employeeId),
    lineUserId: lineUserId === null || lineUserId === undefined || lineUserId === '' ? null : String(lineUserId)
  };
}

function auditFields(req) {
  const actor = actorFromRequest(req);
  return {
    audit_actor_type: actor.type,
    audit_actor_id: actor.id,
    audit_actor_name: actor.name
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
  parseBigintId,
  actorFromRequest,
  auditFields,
  sendError
};
