const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
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
    orders_count: body.ordersCount !== undefined || body.orders_count !== undefined ? toNumber(body.ordersCount ?? body.orders_count) : undefined,
    edit_logs: Array.isArray(body.editLogs || body.edit_logs) ? (body.editLogs || body.edit_logs) : undefined
  };
}

exports.listSales = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.sales));
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
      total_amount: toNumber(body.totalAmount, toNumber(body.cashAmount) + toNumber(body.transferAmount) + toNumber(body.creditAmount)),
      orders_count: toNumber(body.ordersCount),
      edit_logs: Array.isArray(body.editLogs) ? body.editLogs : []
    };
    const { data, error } = await supabase.from(TABLES.sales).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกยอดขายสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกยอดขายได้');
  }
};

exports.updateSale = async (req, res) => {
  try {
    const saleId = parseInteger(req.params.id);
    if (saleId === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data: existing, error: getError } = await supabase.from(TABLES.sales).select('*').eq('id', saleId).single();
    if (getError) throw getError;

    const update = cleanSalePayload(req.body);
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    if (update.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });

    const logs = Array.isArray(existing.edit_logs) ? existing.edit_logs : [];
    Object.entries(update).forEach(([column, value]) => {
      if (existing[column] !== value) {
        logs.push({
          time: new Date().toISOString(),
          by: req.body.updatedBy || req.body.confirmedBy || 'system',
          field: column,
          from: existing[column],
          to: value,
          reason: req.body.reason || ''
        });
      }
    });
    update.edit_logs = logs;

    const { data, error } = await supabase.from(TABLES.sales).update(update).eq('id', saleId).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตยอดขายสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตยอดขายได้');
  }
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
