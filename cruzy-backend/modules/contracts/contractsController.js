const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanContractPayload(body) {
  return {
    employee_id: body.employeeId || body.employee_id,
    contract_type: body.contractType || body.contract_type || body.type,
    start_date: body.startDate || body.start_date || body.start,
    end_date: body.endDate || body.end_date || body.end
  };
}

function validateContractPayload(res, payload, { partial = false } = {}) {
  if (!partial && !required(res, payload, ['employee_id', 'contract_type', 'start_date', 'end_date'])) {
    return false;
  }
  if (payload.contract_type && !['fulltime', 'parttime', 'freelance'].includes(payload.contract_type)) {
    res.status(400).json({ message: 'ประเภทสัญญาจ้างไม่ถูกต้อง' });
    return false;
  }
  if (payload.start_date && payload.end_date && payload.end_date < payload.start_date) {
    res.status(400).json({ message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มสัญญา' });
    return false;
  }
  return true;
}

exports.listContracts = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.contracts, '*', {
      order: [
        { column: 'start_date', ascending: false },
        { column: 'employee_id', ascending: true }
      ]
    }));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลสัญญาจ้างได้');
  }
};

exports.getContract = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.contracts).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลสัญญาจ้างได้');
  }
};

exports.createContract = async (req, res) => {
  try {
    const payload = cleanContractPayload(req.body);
    if (!validateContractPayload(res, payload)) return;
    const { data, error } = await supabase.from(TABLES.contracts).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มสัญญาจ้างสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มสัญญาจ้างได้');
  }
};

exports.updateContract = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanContractPayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (!validateContractPayload(res, payload, { partial: true })) return;
    const { data, error } = await supabase.from(TABLES.contracts).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตสัญญาจ้างสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตสัญญาจ้างได้');
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.contracts).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบสัญญาจ้างสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบสัญญาจ้างได้');
  }
};
