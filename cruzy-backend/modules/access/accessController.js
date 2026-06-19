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

function cleanManualId(value) {
  const id = String(value ?? '').trim();
  return id && id.length <= 255 ? id : null;
}

async function fetchUsers() {
  const rows = await fetchTable(TABLES.users, 'id, username, name, role, scope_type, scope_value, created_at');
  return rows.map(normalizeUser);
}

async function findUserByIdentifier(identifier, select = 'id, username') {
  const value = cleanManualId(identifier);
  if (!value) return null;

  const { data: idRows, error: idError } = await supabase.from(TABLES.users).select(select).eq('id', value).limit(1);
  if (idError) throw idError;
  if (idRows?.[0]) return idRows[0];

  const { data: usernameRows, error: usernameError } = await supabase.from(TABLES.users).select(select).eq('username', value).limit(1);
  if (usernameError) throw usernameError;
  return usernameRows?.[0] || null;
}

async function findActorUser(req) {
  const actorId = String(req.headers['x-cruzy-actor-id'] || '').trim();
  const actorName = String(req.headers['x-cruzy-actor-name'] || '').trim();
  const select = 'id, username, name, role';

  if (actorId) {
    const user = await findUserByIdentifier(actorId, select);
    if (user) return user;
  }

  if (actorName) {
    const { data: usernameRows, error: usernameError } = await supabase.from(TABLES.users).select(select).eq('username', actorName).limit(1);
    if (usernameError) throw usernameError;
    if (usernameRows?.[0]) return usernameRows[0];

    const { data: nameRows, error: nameError } = await supabase.from(TABLES.users).select(select).eq('name', actorName).limit(1);
    if (nameError) throw nameError;
    if (nameRows?.[0]) return nameRows[0];
  }

  return null;
}

exports.requireOwner = async (req, res, next) => {
  try {
    const actor = await findActorUser(req);
    if (actor?.role !== 'owner') {
      return res.status(403).json({ message: 'เฉพาะ Owner เท่านั้นที่จัดการสิทธิ์ได้' });
    }
    req.accessActor = actor;
    next();
  } catch (error) {
    sendError(res, error, 'ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้');
  }
};

exports.getAccessData = async (_req, res) => {
  try {
    const [users, branches, regions] = await Promise.all([
      fetchUsers(),
      fetchTable(TABLES.branches),
      fetchTable(TABLES.regions)
    ]);

    res.json({ users, branches, regions });
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
    if (!req.body.id || !username || !name || !role || !scope_type) return res.status(400).json({ message: 'Missing required fields' });
    const userId = cleanManualId(req.body.id);
    if (!userId) return res.status(400).json({ message: 'รหัสผู้ใช้งานต้องไม่ว่างและยาวไม่เกิน 255 ตัวอักษร' });
    const payload = {
      id: userId,
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
    const identifier = String(req.params.id || '').trim();
    if (!identifier) return res.status(400).json({ message: 'Missing user id' });

    const target = await findUserByIdentifier(identifier);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานที่ต้องการลบ' });

    if (target.username) {
      const { error: salesError } = await supabase
        .from(TABLES.sales)
        .update({ confirmed_by: null })
        .eq('confirmed_by', target.username);
      if (salesError) throw salesError;

      const { error: depositsError } = await supabase
        .from(TABLES.cashDeposits)
        .update({ verified_by: null })
        .eq('verified_by', target.username);
      if (depositsError) throw depositsError;
    }

    const { error } = await supabase.from(TABLES.users).delete().eq('id', target.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบผู้ใช้งานได้');
  }
};
