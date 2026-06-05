const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanCashDepositPayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined ? parseInteger(body.branchId ?? body.branch_id) : undefined;
  return {
    deposit_date: body.depositDate || body.deposit_date,
    branch_id: branchId,
    expected_amount: body.expectedAmount !== undefined || body.expected_amount !== undefined ? toNumber(body.expectedAmount ?? body.expected_amount) : undefined,
    deposited_amount: body.depositedAmount !== undefined || body.deposited_amount !== undefined ? toNumber(body.depositedAmount ?? body.deposited_amount) : undefined,
    slip_url: body.slipUrl || body.slip_url,
    status: body.status,
    bank_account_id: body.bankAccountId || body.bank_account_id,
    deposited_by: body.depositedBy || body.deposited_by,
    verified_by: body.verifiedBy || body.verified_by,
    verified_at: body.verifiedAt || body.verified_at
  };
}

exports.listCashDeposits = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.cashDeposits));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลรายการฝากเงินได้');
  }
};

exports.getCashDeposit = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.cashDeposits).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลรายการฝากเงินได้');
  }
};

exports.createCashDeposit = async (req, res) => {
  try {
    const body = req.body;
    if (!required(res, body, ['depositDate', 'branchId', 'expectedAmount'])) return;
    const branchId = parseInteger(body.branchId);
    if (branchId === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    
    const payload = {
      deposit_date: body.depositDate,
      branch_id: branchId,
      expected_amount: toNumber(body.expectedAmount),
      deposited_amount: toNumber(body.depositedAmount, 0),
      slip_url: body.slipUrl || null,
      status: body.status || 'waiting',
      bank_account_id: body.bankAccountId || null,
      deposited_by: body.depositedBy || null,
      verified_by: body.verifiedBy || null,
      verified_at: body.verifiedAt || null
    };
    
    const { data, error } = await supabase.from(TABLES.cashDeposits).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกรายการฝากเงินสำเร็จ', data });
  } catch (error) {
    if (error.code === '23505' || error.code === 23505) {
      const message = error.message && String(error.message).includes('unique_branch_deposit_date')
        ? 'มีรายการฝากเงินของสาขานี้แล้วในวันเดียวกัน กรุณาแก้ไขรายการเดิม'
        : 'รายการฝากเงินซ้ำในฐานข้อมูล';
      return sendError(res, error, message, 409);
    }
    sendError(res, error, 'ไม่สามารถบันทึกรายการฝากเงินได้');
  }
};

exports.updateCashDeposit = async (req, res) => {
  try {
    const depositId = parseInteger(req.params.id);
    if (depositId === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data: existing, error: getError } = await supabase.from(TABLES.cashDeposits).select('*').eq('id', depositId).single();
    if (getError) throw getError;
    if (existing.status === 'verified') {
      return res.status(403).json({ message: 'รายการฝากเงินนี้ได้รับการตรวจสอบแล้ว ไม่สามารถปรับแก้ไขได้' });
    }
    
    const update = cleanCashDepositPayload(req.body);
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    if (update.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    
    const { data, error } = await supabase.from(TABLES.cashDeposits).update(update).eq('id', depositId).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตรายการฝากเงินสำเร็จ', data });
  } catch (error) {
    if (error.code === '23505' || error.code === 23505) {
      const message = error.message && String(error.message).includes('unique_branch_deposit_date')
        ? 'มีรายการฝากเงินของสาขานี้แล้วในวันเดียวกัน กรุณาแก้ไขรายการเดิม'
        : 'รายการฝากเงินซ้ำในฐานข้อมูล';
      return sendError(res, error, message, 409);
    }
    sendError(res, error, 'ไม่สามารถอัปเดตรายการฝากเงินได้');
  }
};

exports.deleteCashDeposit = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.cashDeposits).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบรายการฝากเงินสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบรายการฝากเงินได้');
  }
};
