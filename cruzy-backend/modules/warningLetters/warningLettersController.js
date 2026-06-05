const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanWarningLetterPayload(body) {
  const rawBranchId = body.branchId ?? body.branch_id;
  const branchId = body.branchId === undefined && body.branch_id === undefined
    ? undefined
    : rawBranchId === null || rawBranchId === ''
      ? null
      : parseInteger(rawBranchId);
  const templateId = body.templateId === undefined && body.template_id === undefined
    ? undefined
    : parseInteger(body.templateId ?? body.template_id);
  return {
    employee_id: body.employeeId || body.employee_id,
    template_id: templateId,
    level: body.level,
    issue_date: body.issueDate || body.issue_date,
    reason: body.reason,
    branch_id: branchId,
    issued_by: body.issuedBy || body.issued_by,
    status: body.status || body.status === '' ? body.status : undefined,
    is_signed_by_emp: body.isSignedByEmp === undefined && body.is_signed_by_emp === undefined ? undefined : Boolean(body.isSignedByEmp ?? body.is_signed_by_emp),
    signed_at: body.signedAt === undefined && body.signed_at === undefined ? undefined : body.signedAt || body.signed_at || null
  };
}

exports.listWarningLetters = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.warningLetters));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลหนังสือเตือนได้');
  }
};

exports.getWarningLetter = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.warningLetters).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลหนังสือเตือนได้');
  }
};

exports.createWarningLetter = async (req, res) => {
  try {
    const payload = cleanWarningLetterPayload(req.body);
    if (!required(res, payload, ['employee_id', 'level', 'issue_date', 'reason', 'issued_by'])) return;
    if (payload.template_id === null && (req.body.templateId !== undefined || req.body.template_id !== undefined)) return res.status(400).json({ message: 'templateId ต้องเป็นตัวเลข' });
    const rawBranchId = req.body.branchId ?? req.body.branch_id;
    if (payload.branch_id === null && rawBranchId !== null && rawBranchId !== '' && rawBranchId !== undefined) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    if (payload.branch_id === undefined) payload.branch_id = null;
    if (payload.status === undefined) payload.status = 'issued';
    if (payload.is_signed_by_emp === undefined) payload.is_signed_by_emp = false;
    let { data, error } = await supabase.from(TABLES.warningLetters).insert([payload]).select().single();
    if (error && error.code === '23503' && payload.template_id !== null && payload.template_id !== undefined) {
      ({ data, error } = await supabase.from(TABLES.warningLetters).insert([{ ...payload, template_id: null }]).select().single());
    }
    if (error) throw error;
    res.status(201).json({ message: 'ออกหนังสือเตือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถออกหนังสือเตือนได้');
  }
};

exports.updateWarningLetter = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanWarningLetterPayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.template_id === null) return res.status(400).json({ message: 'templateId ต้องเป็นตัวเลข' });
    const rawBranchId = req.body.branchId ?? req.body.branch_id;
    if (payload.branch_id === null && rawBranchId !== null && rawBranchId !== '' && rawBranchId !== undefined) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.warningLetters).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตหนังสือเตือนสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตหนังสือเตือนได้');
  }
};

exports.deleteWarningLetter = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.warningLetters).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบหนังสือเตือนสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบหนังสือเตือนได้');
  }
};
