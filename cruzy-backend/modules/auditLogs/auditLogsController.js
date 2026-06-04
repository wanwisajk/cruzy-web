const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

exports.listAuditLogs = async (req, res) => {
  try {
    const fromDate = req.query.from_date;
    const toDate = req.query.to_date;
    const action = req.query.action;
    const tableName = req.query.table_name;
    const search = req.query.search;

    let query = supabase.from(TABLES.systemAuditLogs).select('*').order('created_at', { ascending: false });

    if (fromDate) query = query.gte('created_at', `${fromDate}T00:00:00`);
    if (toDate) query = query.lte('created_at', `${toDate}T23:59:59`);
    if (action) query = query.eq('action', action);
    if (tableName) query = query.eq('table_name', tableName);

    const { data, error } = await query.limit(500);
    if (error) throw error;

    let logs = data || [];
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        (log.user_name || '').toLowerCase().includes(searchLower) ||
        (log.description || '').toLowerCase().includes(searchLower) ||
        (log.action || '').toLowerCase().includes(searchLower)
      );
    }

    res.json(logs);
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
    const { user_name, action, table_name, record_id, source, description, old_value, new_value } = req.body;

    const payload = {
      user_name: user_name || 'system',
      action,
      table_name,
      record_id: record_id || null,
      source: source || 'dashboard',
      description: description || null,
      old_value: old_value || {},
      new_value: new_value || {}
    };

    const { data, error } = await supabase.from(TABLES.systemAuditLogs).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกประวัติสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกประวัติได้');
  }
};
