const { applyQueryOptions, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const { generateMonthlySalarySummaries } = require('./salarySummaryGenerator');

function cleanSalarySummaryPayload(body) {
  return {
    employee_id: body.employeeId || body.employee_id,
    salary_month: body.salaryMonth || body.salary_month,
    gross_amount: body.grossAmount !== undefined ? toNumber(body.grossAmount, 0) : body.gross_amount !== undefined ? toNumber(body.gross_amount, 0) : undefined,
    deduction_amount: body.deductionAmount !== undefined ? toNumber(body.deductionAmount, 0) : body.deduction_amount !== undefined ? toNumber(body.deduction_amount, 0) : undefined,
    net_amount: body.netAmount !== undefined ? toNumber(body.netAmount, 0) : body.net_amount !== undefined ? toNumber(body.net_amount, 0) : undefined,
    detail: body.detail === undefined ? undefined : body.detail || {},
    line_sent_at: body.lineSentAt || body.line_sent_at || undefined
  };
}

function stripUndefined(payload) {
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

exports.listSalarySummaries = async (req, res) => {
  try {
    let query = supabase.from(TABLES.salarySummaries).select('*');
    if (req.query.employeeId || req.query.employee_id) query = query.eq('employee_id', req.query.employeeId || req.query.employee_id);
    if (req.query.from || req.query.from_date) query = query.gte('salary_month', req.query.from || req.query.from_date);
    if (req.query.to || req.query.to_date) query = query.lte('salary_month', req.query.to || req.query.to_date);
    query = applyQueryOptions(query, {
      order: [
        { column: 'salary_month', ascending: false },
        { column: 'employee_id', ascending: true }
      ]
    });
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงสรุปเงินเดือนได้');
  }
};

exports.getSalarySummary = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.salarySummaries).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงสรุปเงินเดือนได้');
  }
};

exports.createSalarySummary = async (req, res) => {
  try {
    const payload = stripUndefined(cleanSalarySummaryPayload(req.body));
    if (!required(res, payload, ['employee_id', 'salary_month'])) return;
    if (payload.gross_amount === undefined) payload.gross_amount = 0;
    if (payload.deduction_amount === undefined) payload.deduction_amount = 0;
    if (payload.net_amount === undefined) payload.net_amount = 0;
    if (payload.detail === undefined) payload.detail = {};
    const { data, error } = await supabase.from(TABLES.salarySummaries).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกสรุปเงินเดือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกสรุปเงินเดือนได้');
  }
};

exports.updateSalarySummary = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = stripUndefined(cleanSalarySummaryPayload(req.body));
    const { data, error } = await supabase.from(TABLES.salarySummaries).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตสรุปเงินเดือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตสรุปเงินเดือนได้');
  }
};

exports.generateSalarySummaries = async (req, res) => {
  try {
    const month = req.body?.month || req.body?.salaryMonth || req.query.month || req.query.salary_month;
    const result = await generateMonthlySalarySummaries(month);
    res.json({ message: 'สร้างสรุปเงินเดือนอัตโนมัติสำเร็จ', ...result });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถสร้างสรุปเงินเดือนอัตโนมัติได้');
  }
};
