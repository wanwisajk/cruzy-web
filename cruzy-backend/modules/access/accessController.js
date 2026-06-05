const { fetchTable } = require('../../shared/db');
const { sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const { normalizeUser } = require('../../shared/users');
const { supabase } = require('../../shared/db');
const crypto = require('crypto');

function hashPassword(pw) {
  if (!pw) return null;
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function fetchUsers() {
  const rows = await fetchTable(TABLES.users, 'id, username, name, role, scope_type, scope_value, created_at');
  return rows.map(normalizeUser);
}

exports.getAccessData = async (_req, res) => {
  try {
    const [users, branches, regions, employees] = await Promise.all([
      fetchUsers(),
      fetchTable(TABLES.branches),
      fetchTable(TABLES.regions),
      fetchTable(TABLES.employees, 'id, name, region_id')
    ]);

    res.json({ users, branches, regions, employees });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลสิทธิ์ได้');
  }
};

exports.listUsers = async (_req, res) => {
  try {
    res.json(await fetchUsers());
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, name, role, scope_type, scope_value, password } = req.body;
    if (!username || !name || !role || !scope_type) return res.status(400).json({ message: 'Missing required fields' });
    const payload = {
      username,
      name,
      role,
      scope_type,
      scope_value: scope_value || null,
      password_hash: hashPassword(password)
    };
    const { data, error } = await supabase.from(TABLES.users).insert([payload]).select().limit(1);
    if (error) throw error;
    res.json(normalizeUser(data[0]));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถสร้างผู้ใช้งานได้');
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, role, scope_type, scope_value, password } = req.body;
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (role !== undefined) payload.role = role;
    if (scope_type !== undefined) payload.scope_type = scope_type;
    if (scope_value !== undefined) payload.scope_value = scope_value;
    if (password !== undefined) payload.password_hash = hashPassword(password);
    const { data, error } = await supabase.from(TABLES.users).update(payload).eq('id', id).select().limit(1);
    if (error) throw error;
    res.json(normalizeUser(data[0]));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตผู้ใช้งานได้');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from(TABLES.users).delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบผู้ใช้งานได้');
  }
};
