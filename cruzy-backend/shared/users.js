const crypto = require('crypto');

function normalizeUser(row) {
  const scope = row.scope_type === 'all' ? 'all' : row.scope_value;
  const labelMap = { owner: 'Owner', regional: 'Regional', branch: 'Branch' };
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    label: labelMap[row.role] || row.role,
    scopeType: row.scope_type,
    scope,
    employeeId: row.employee_id || null,
    employee_id: row.employee_id || null
  };
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (inputPassword === storedPassword) return true;
  const sha256 = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return sha256 === storedPassword;
}

module.exports = {
  normalizeUser,
  verifyPassword
};
