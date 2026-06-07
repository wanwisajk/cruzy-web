const { MISSING_TABLE_CODES, supabase } = require('../../shared/db');
const { parseInteger, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

const MAX_ROWS_PER_SOURCE = 500;

function rowId(value) {
  return value === null || value === undefined ? '' : String(value);
}

function getRowTime(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || '';
}

function safeJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function employeeLabel(map, employeeId, fallback = '') {
  const employee = map.get(rowId(employeeId));
  if (employee) return employee.name || employee.full_name || employee.nickname || `พนักงาน ${employee.id}`;
  return fallback || (employeeId ? `พนักงาน ${employeeId}` : 'system');
}

function userLabel(map, userId, fallback = '') {
  const user = map.get(rowId(userId));
  if (user) return user.name || user.username || `ผู้ใช้ ${user.id}`;
  return fallback || (userId ? `ผู้ใช้ ${userId}` : 'system');
}

function extractEmployeeId(row) {
  const oldValue = safeJson(row.old_value);
  const newValue = safeJson(row.new_value);
  if (row.table_name === TABLES.employees || row.table_name === 'employees') return row.record_id || row.entity_id;
  return newValue.employee_id || newValue.employeeId || newValue.emp_id || newValue.empId ||
    oldValue.employee_id || oldValue.employeeId || oldValue.emp_id || oldValue.empId || null;
}

function branchLabel(map, branchId, fallback = '') {
  const branch = map.get(rowId(branchId));
  if (branch) return `${branch.code || branch.id} ${branch.name || ''}`.trim();
  return fallback || (branchId ? `สาขา ${branchId}` : '-');
}

function normalizeAction(action, fallback = 'INFO') {
  const value = String(action || fallback).trim();
  return value ? value.toUpperCase() : fallback;
}

async function optionalQuery(table, buildQuery) {
  const query = buildQuery(supabase.from(table));
  const { data, error } = await query;
  if (error) {
    if (MISSING_TABLE_CODES.includes(error.code) || String(error.message || '').includes('does not exist')) {
      console.warn(`optional log source skipped: ${table}`);
      return [];
    }
    throw error;
  }
  return data || [];
}

async function getOptionalRows(table, select = '*') {
  return optionalQuery(table, (query) => query.select(select));
}

async function getSalesByIds(ids) {
  const uniqueIds = [...new Set(ids.map((id) => parseInteger(id)).filter((id) => id !== null))];
  if (!uniqueIds.length) return [];
  return optionalQuery(TABLES.sales, (query) => query.select('id, branch_id, sell_date').in('id', uniqueIds));
}

async function getOptionalLogs(table, fromDate, toDate) {
  return optionalQuery(table, (query) => {
    let built = query.select('*').order('created_at', { ascending: false }).limit(MAX_ROWS_PER_SOURCE);
    if (fromDate) built = built.gte('created_at', `${fromDate}T00:00:00`);
    if (toDate) built = built.lte('created_at', `${toDate}T23:59:59`);
    return built;
  });
}

function buildUnifiedLogs({ systemAuditLogs, inspectionLogs, salesLogs, sales, employees, branches, users }) {
  const employeeMap = new Map((employees || []).map((employee) => [rowId(employee.id), employee]));
  const branchMap = new Map((branches || []).map((branch) => [rowId(branch.id), branch]));
  const saleMap = new Map((sales || []).map((sale) => [rowId(sale.id), sale]));
  const userMap = new Map((users || []).map((user) => [rowId(user.id), user]));
  const logs = [];

  (systemAuditLogs || []).forEach((row) => {
    const oldValue = safeJson(row.old_value);
    const newValue = safeJson(row.new_value);
    const employeeId = extractEmployeeId(row);
    const employeeName = employeeId ? employeeLabel(employeeMap, employeeId, '') : '';
    const actorName = row.user_name || userLabel(userMap, row.actor_id, row.actor || row.created_by || '');
    logs.push({
      id: `audit-${row.id}`,
      raw_id: row.id,
      created_at: getRowTime(row.created_at, row.updated_at),
      action: normalizeAction(row.action),
      module: row.module || row.page || row.table_name || 'ระบบ',
      table_name: row.table_name || 'system_audit_logs',
      record_id: row.record_id || row.entity_id || null,
      user_name: actorName || 'system',
      subject: employeeName || row.entity_name || row.target_name || row.record_id || '-',
      employee_id: employeeId || null,
      employee_name: employeeName || null,
      branch: branchLabel(branchMap, row.branch_id, row.branch_code),
      source: row.source || 'audit',
      actor_type: row.actor_type || null,
      actor_id: row.actor_id || null,
      description: row.description || 'บันทึกประวัติระบบ',
      old_value: oldValue,
      new_value: newValue,
      raw: row
    });
  });

  (inspectionLogs || []).forEach((row) => {
    logs.push({
      id: `inspection-log-${row.id}`,
      raw_id: row.id,
      created_at: getRowTime(row.created_at, row.updated_at),
      action: normalizeAction(row.action),
      module: 'ตรวจร้าน',
      table_name: 'inspection_logs',
      record_id: row.inspection_id || null,
      user_name: row.user_name || 'system',
      subject: row.inspection_id ? `Inspection #${row.inspection_id}` : '-',
      branch: '-',
      source: row.source || 'inspection',
      description: row.description || 'บันทึกตรวจร้าน',
      old_value: {},
      new_value: {},
      raw: row
    });
  });

  (salesLogs || []).forEach((row) => {
    const sale = saleMap.get(rowId(row.sale_id)) || {};
    const actorName = userLabel(userMap, row.edited_by, row.edited_by || 'system');
    logs.push({
      id: `sale-log-${row.id}`,
      raw_id: row.id,
      created_at: getRowTime(row.created_at, row.updated_at),
      action: 'UPDATE',
      module: 'ยอดขาย',
      table_name: 'sales_logs',
      record_id: row.sale_id || null,
      user_name: actorName,
      subject: row.sale_id ? `Sale #${row.sale_id}` : '-',
      branch: branchLabel(branchMap, sale.branch_id || row.branch_id),
      source: 'sales',
      description: row.field_name
        ? `แก้ไข ${row.field_name}: ${row.old_value ?? '-'} -> ${row.new_value ?? '-'}`
        : (row.reason || 'แก้ไขยอดขาย'),
      old_value: row.field_name ? { [row.field_name]: row.old_value } : {},
      new_value: row.field_name ? { [row.field_name]: row.new_value } : {},
      reason: row.reason || '',
      raw: row
    });
  });

  return logs
    .filter((log) => log.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

exports.listAuditLogs = async (req, res) => {
  try {
    const fromDate = req.query.from_date;
    const toDate = req.query.to_date;
    const action = req.query.action;
    const tableName = req.query.table_name;
    const moduleName = req.query.module;
    const source = req.query.source;
    const search = req.query.search;

    const [systemAuditLogs, inspectionLogs, salesLogs] = await Promise.all([
      getOptionalLogs(TABLES.systemAuditLogs, fromDate, toDate),
      getOptionalLogs(TABLES.inspectionLogs, fromDate, toDate),
      getOptionalLogs(TABLES.salesLogs, fromDate, toDate)
    ]);
    const [sales, employees, branches, users] = await Promise.all([
      getSalesByIds(salesLogs.map((row) => row.sale_id)),
      getOptionalRows(TABLES.employees, 'id, name, nickname'),
      getOptionalRows(TABLES.branches, 'id, code, name'),
      getOptionalRows(TABLES.users, 'id, username, name')
    ]);

    let logs = buildUnifiedLogs({ systemAuditLogs, inspectionLogs, salesLogs, sales, employees, branches, users });
    if (action) logs = logs.filter(log => String(log.action).toLowerCase() === String(action).toLowerCase());
    if (tableName) logs = logs.filter(log => String(log.table_name).toLowerCase() === String(tableName).toLowerCase());
    if (moduleName) logs = logs.filter(log => String(log.module).toLowerCase() === String(moduleName).toLowerCase());
    if (source) logs = logs.filter(log => String(log.source).toLowerCase() === String(source).toLowerCase());
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        (log.user_name || '').toLowerCase().includes(searchLower) ||
        (log.description || '').toLowerCase().includes(searchLower) ||
        (log.action || '').toLowerCase().includes(searchLower) ||
        (log.module || '').toLowerCase().includes(searchLower) ||
        (log.table_name || '').toLowerCase().includes(searchLower) ||
        (log.subject || '').toLowerCase().includes(searchLower) ||
        (log.branch || '').toLowerCase().includes(searchLower) ||
        (log.actor_type || '').toLowerCase().includes(searchLower) ||
        (log.actor_id || '').toLowerCase().includes(searchLower)
      );
    }

    res.json(logs.slice(0, 750));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงประวัติระบบได้');
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.systemAuditLogs).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลประวัติระบบได้');
  }
};

exports.createAuditLog = async (req, res) => {
  try {
    const { user_name, action, table_name, record_id, source, description, old_value, new_value, module, branch_id, entity_name, actor_type, actor_id } = req.body;

    const payload = {
      user_name: user_name || 'system',
      action,
      table_name,
      record_id: record_id || null,
      source: source || 'dashboard',
      description: description || null,
      old_value: old_value || {},
      new_value: new_value || {},
      module: module || null,
      branch_id: branch_id || null,
      entity_name: entity_name || null,
      actor_type: actor_type || null,
      actor_id: actor_id || null
    };

    const { data, error } = await supabase.from(TABLES.systemAuditLogs).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกประวัติสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกประวัติได้');
  }
};
