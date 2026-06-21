const { fetchTable, supabase } = require('../../shared/db');
const { syncDepositCashLedger, deleteLedgerEntry } = require('../../shared/cashLedger');
const { actorFromRequest, parseBigintId, parseInteger, required, sendError, toNumber, auditFields } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanCashDepositPayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined ? parseInteger(body.branchId ?? body.branch_id) : undefined;
  const coveredDate = body.coveredDate || body.covered_date || body.coveredFromDate || body.covered_from_date;
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
    verified_at: body.verifiedAt || body.verified_at,
    covered_date: coveredDate,
    variance_amount: body.varianceAmount !== undefined || body.variance_amount !== undefined ? toNumber(body.varianceAmount ?? body.variance_amount) : undefined,
    slip_ocr_status: body.slipOcrStatus || body.slip_ocr_status,
    slip_ocr_amount: body.slipOcrAmount !== undefined || body.slip_ocr_amount !== undefined ? toNumber(body.slipOcrAmount ?? body.slip_ocr_amount) : undefined,
    slip_ocr_confidence: body.slipOcrConfidence !== undefined || body.slip_ocr_confidence !== undefined ? toNumber(body.slipOcrConfidence ?? body.slip_ocr_confidence) : undefined,
    slip_ocr_text: body.slipOcrText || body.slip_ocr_text,
    slip_ocr_checked_at: body.slipOcrCheckedAt || body.slip_ocr_checked_at
  };
}

function stripOptionalFields(payload) {
  const cleaned = { ...payload };
  delete cleaned.covered_date;
  delete cleaned.variance_amount;
  delete cleaned.slip_ocr_status;
  delete cleaned.slip_ocr_amount;
  delete cleaned.slip_ocr_confidence;
  delete cleaned.slip_ocr_text;
  delete cleaned.slip_ocr_checked_at;
  return cleaned;
}

function isMissingOptionalColumn(error) {
  return String(error?.code || '').toUpperCase().includes('PGRST204')
    && /slip_ocr_|covered_date|variance_amount/.test(String(error?.message || ''));
}

exports.listCashDeposits = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.cashDeposits, '*', {
      order: [
        { column: 'deposit_date', ascending: false },
        { column: 'branch_id', ascending: true }
      ]
    }));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลรายการฝากเงินได้');
  }
};

exports.getCashDeposit = async (req, res) => {
  try {
    const id = parseBigintId(req.params.id);
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
    if (!required(res, body, ['depositDate', 'branchId'])) return;
    const branchId = parseInteger(body.branchId);
    if (branchId === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const coveredDate = body.coveredDate || body.covered_date || body.coveredFromDate || body.covered_from_date || body.depositDate;
    const depositedAmount = toNumber(body.depositedAmount ?? body.deposited_amount, 0);
    const varianceAmount = toNumber(body.varianceAmount ?? body.variance_amount, 0);
    const expectedAmount = body.expectedAmount !== undefined || body.expected_amount !== undefined
      ? toNumber(body.expectedAmount ?? body.expected_amount)
      : depositedAmount + varianceAmount;
    
    const payload = {
      deposit_date: body.depositDate,
      branch_id: branchId,
      expected_amount: expectedAmount,
      deposited_amount: depositedAmount,
      slip_url: body.slipUrl || null,
      status: body.status || 'waiting',
      bank_account_id: body.bankAccountId || null,
      deposited_by: body.depositedBy || null,
      verified_by: body.verifiedBy || null,
      verified_at: body.verifiedAt || null,
      covered_date: coveredDate || null,
      variance_amount: varianceAmount,
      slip_ocr_status: body.slipOcrStatus || 'unchecked',
      slip_ocr_amount: body.slipOcrAmount !== undefined ? toNumber(body.slipOcrAmount) : null,
      slip_ocr_confidence: body.slipOcrConfidence !== undefined ? toNumber(body.slipOcrConfidence) : null,
      slip_ocr_text: body.slipOcrText || null,
      slip_ocr_checked_at: body.slipOcrCheckedAt || null
    };
    
    let { data, error } = await supabase.from(TABLES.cashDeposits).insert([payload]).select().single();
    if (error && isMissingOptionalColumn(error)) {
      const fallback = await supabase.from(TABLES.cashDeposits).insert([stripOptionalFields(payload)]).select().single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    await syncDepositCashLedger(data);
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
    const depositId = parseBigintId(req.params.id);
    if (depositId === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data: existing, error: getError } = await supabase.from(TABLES.cashDeposits).select('*').eq('id', depositId).single();
    if (getError) throw getError;
    if (existing.status === 'verified') {
      return res.status(403).json({ message: 'รายการฝากเงินนี้ได้รับการตรวจสอบแล้ว ไม่สามารถปรับแก้ไขได้' });
    }
    
    const update = cleanCashDepositPayload(req.body);
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    if (update.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    
    let { data, error } = await supabase.from(TABLES.cashDeposits).update(update).eq('id', depositId).select().single();
    if (error && isMissingOptionalColumn(error)) {
      const fallback = await supabase.from(TABLES.cashDeposits).update(stripOptionalFields(update)).eq('id', depositId).select().single();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    await syncDepositCashLedger(data);
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

async function setCashDepositStatus(req, res, status, successMessage) {
  try {
    const id = parseBigintId(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const actor = actorFromRequest(req);
    const payload = { status, ...auditFields(req) };
    if (status === 'verified') {
      payload.verified_by = actor.username || actor.name || actor.id;
      payload.verified_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from(TABLES.cashDeposits).update(payload).eq('id', id).select().single();
    if (error) throw error;
    await syncDepositCashLedger(data);
    res.json({ message: successMessage, data });
  } catch (error) {
    if (String(error.code || '').toUpperCase().includes('PGRST204') || String(error.message || '').includes("Could not find the 'audit_actor_id'")) {
      try {
        const id = parseBigintId(req.params.id);
        const actor = actorFromRequest(req);
        const fallbackPayload = { status };
        if (status === 'verified') {
          fallbackPayload.verified_by = actor.username || actor.name || actor.id;
          fallbackPayload.verified_at = new Date().toISOString();
        }
        const { data, error: err2 } = await supabase.from(TABLES.cashDeposits).update(fallbackPayload).eq('id', id).select().single();
        if (err2) throw err2;
        await syncDepositCashLedger(data);
        return res.json({ message: successMessage, data });
      } catch (err2) {
        return sendError(res, err2, 'ไม่สามารถอัปเดตรายการฝากเงินได้');
      }
    }

    sendError(res, error, 'ไม่สามารถอัปเดตรายการฝากเงินได้');
  }
}

exports.updateCashDepositStatus = async (req, res) => {
  const { status } = req.body;
  if (!['waiting', 'verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }
  return setCashDepositStatus(req, res, status, 'อัปเดตสถานะรายการฝากเงินเรียบร้อยแล้ว');
};

exports.approveCashDeposit = async (req, res) => {
  return setCashDepositStatus(req, res, 'verified', 'ตรวจสอบรายการฝากเงินเรียบร้อยแล้ว');
};

exports.rejectCashDeposit = async (req, res) => {
  return setCashDepositStatus(req, res, 'rejected', 'ปฏิเสธรายการฝากเงินเรียบร้อยแล้ว');
};

exports.deleteCashDeposit = async (req, res) => {
  try {
    const id = parseBigintId(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    await deleteLedgerEntry('cash_deposit_id', id, 'deposit');
    const { error } = await supabase.from(TABLES.cashDeposits).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบรายการฝากเงินสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบรายการฝากเงินได้');
  }
};
