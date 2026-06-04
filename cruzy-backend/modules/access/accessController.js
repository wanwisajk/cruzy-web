const { fetchTable } = require('../../shared/db');
const { sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const { normalizeUser } = require('../../shared/users');

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
