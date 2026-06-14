const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber, auditFields } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanSalePayload(body) {
  const branchId = body.branchId !== undefined || body.branch_id !== undefined ? parseInteger(body.branchId ?? body.branch_id) : undefined;
  return {
    sell_date: body.sellDate || body.sell_date,
    branch_id: branchId,
    cash_amount: body.cashAmount !== undefined || body.cash_amount !== undefined ? toNumber(body.cashAmount ?? body.cash_amount) : undefined,
    transfer_amount: body.transferAmount !== undefined || body.transfer_amount !== undefined ? toNumber(body.transferAmount ?? body.transfer_amount) : undefined,
    credit_amount: body.creditAmount !== undefined || body.credit_amount !== undefined ? toNumber(body.creditAmount ?? body.credit_amount) : undefined,
    total_amount: body.totalAmount !== undefined || body.total_amount !== undefined ? toNumber(body.totalAmount ?? body.total_amount) : undefined,
    qr_amount: body.qrAmount !== undefined || body.qr_amount !== undefined ? toNumber(body.qrAmount ?? body.qr_amount) : undefined,
    submitted_by: body.submittedBy || body.submitted_by,
    submitted_at: body.submittedAt || body.submitted_at,
    confirmed_by: body.confirmedBy || body.confirmed_by,
    confirmed_at: body.confirmedAt || body.confirmed_at,
    status: body.status,
    raw_text: body.rawText || body.raw_text
  };
}

exports.listSales = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.sales, '*', {
      order: [
        { column: 'sell_date', ascending: false },
        { column: 'branch_id', ascending: true }
      ]
    }));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลยอดขายได้');
  }
};

exports.getSale = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.sales).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลยอดขายได้');
  }
};

exports.createSale = async (req, res) => {
  try {
    const body = req.body;
    if (!required(res, body, ['sellDate', 'branchId'])) return;
    const branchId = parseInteger(body.branchId);
    if (branchId === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const payload = {
      sell_date: body.sellDate,
      branch_id: branchId,
      cash_amount: toNumber(body.cashAmount),
      transfer_amount: toNumber(body.transferAmount),
      credit_amount: toNumber(body.creditAmount),
      qr_amount: toNumber(body.qrAmount),
      total_amount: toNumber(body.totalAmount, toNumber(body.cashAmount) + toNumber(body.transferAmount) + toNumber(body.creditAmount) + toNumber(body.qrAmount)),
      orders_count: 0,
      submitted_by: body.submittedBy || null,
      submitted_at: body.submittedAt || null,
      confirmed_by: body.confirmedBy || null,
      confirmed_at: body.confirmedAt || null,
      status: body.status || 'draft',
      raw_text: body.rawText || null
    };
    const { data, error } = await supabase.from(TABLES.sales).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกยอดขายสำเร็จ', data });
  } catch (error) {
    if (error.code === '23505' || error.code === 23505) {
      const message = error.message && String(error.message).includes('unique_branch_sell_date')
        ? 'มียอดขายสาขานี้แล้วในวันเดียวกัน กรุณาแก้ไขรายการเดิม'
        : 'ยอดขายซ้ำในฐานข้อมูล';
      return sendError(res, error, message, 409);
    }
    sendError(res, error, 'ไม่สามารถบันทึกยอดขายได้');
  }
};

exports.updateSale = async (req, res) => {
  try {
    const saleId = parseInteger(req.params.id);
    if (saleId === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data: existing, error: getError } = await supabase.from(TABLES.sales).select('*').eq('id', saleId).single();
    if (getError) throw getError;
    if (existing.status === 'confirmed') {
      return res.status(403).json({ message: 'ยอดขายนี้ได้รับการยืนยันแล้ว ไม่สามารถปรับแก้ไขได้' });
    }

    const update = cleanSalePayload(req.body);
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    if (update.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });

    const logs = Object.entries(update)
      .filter(([column, value]) => String(existing[column] ?? '') !== String(value ?? ''))
      .map(([column, value]) => ({
        sale_id: saleId,
        field_name: column,
        old_value: existing[column] === undefined || existing[column] === null ? null : String(existing[column]),
        new_value: value === undefined || value === null ? null : String(value),
        reason: req.body.reason || '',
        edited_by: req.body.updatedBy || null
      }));

    const { data, error } = await supabase.from(TABLES.sales).update(update).eq('id', saleId).select().single();
    if (error) throw error;
    if (logs.length) {
      const { error: logError } = await supabase.from(TABLES.salesLogs).insert(logs);
      if (logError) console.error('insert sales_logs failed:', logError);
    }
    res.json({ message: 'อัปเดตยอดขายสำเร็จ', data });
  } catch (error) {
    if (error.code === '23505' || error.code === 23505) {
      const message = error.message && String(error.message).includes('unique_branch_sell_date')
        ? 'มียอดขายสาขานี้แล้วในวันเดียวกัน กรุณาแก้ไขรายการเดิม'
        : 'ยอดขายซ้ำในฐานข้อมูล';
      return sendError(res, error, message, 409);
    }
    sendError(res, error, 'ไม่สามารถอัปเดตยอดขายได้');
  }
};

async function setSaleStatus(req, res, status, successMessage) {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = { status, ...auditFields(req) };
    const { data, error } = await supabase.from(TABLES.sales).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: successMessage, data });
  } catch (error) {
    // If audit columns don't exist in this table, retry without audit fields
    if (String(error.code || '').toUpperCase().includes('PGRST204') || String(error.message || '').includes("Could not find the 'audit_actor_id'")) {
      try {
        const id = parseInteger(req.params.id);
        const { data, error: err2 } = await supabase.from(TABLES.sales).update({ status }).eq('id', id).select().single();
        if (err2) throw err2;
        return res.json({ message: successMessage, data });
      } catch (err2) {
        return sendError(res, err2, 'ไม่สามารถอัปเดตสถานะยอดขายได้');
      }
    }

    sendError(res, error, 'ไม่สามารถอัปเดตสถานะยอดขายได้');
  }
}

exports.updateSaleStatus = async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'submitted', 'confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }
  return setSaleStatus(req, res, status, 'อัปเดตสถานะยอดขายเรียบร้อยแล้ว');
};

exports.approveSale = async (req, res) => {
  return setSaleStatus(req, res, 'confirmed', 'ยืนยันยอดขายเรียบร้อยแล้ว');
};

exports.rejectSale = async (req, res) => {
  return setSaleStatus(req, res, 'rejected', 'ปฏิเสธยอดขายเรียบร้อยแล้ว');
};

exports.deleteSale = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.sales).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบยอดขายสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบยอดขายได้');
  }
};
