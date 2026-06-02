const { fetchTable, supabase } = require('../../shared/db');
const { required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanBankAccountPayload(body) {
  const bankShort = body.bankShort || body.bank_short;
  return {
    id: body.id || bankShort,
    bank_name: body.bankName || body.bank_name,
    bank_short: bankShort,
    account_no: body.accountNo || body.account_no,
    account_name: body.accountName || body.account_name,
    account_type: body.accountType || body.account_type || 'ออมทรัพย์',
    color_code: body.colorCode || body.color_code || '#138F2D',
    is_active: body.isActive === undefined ? body.is_active !== false : Boolean(body.isActive)
  };
}

exports.listBankAccounts = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.bankAccounts));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลบัญชีธนาคารได้');
  }
};

exports.getBankAccount = async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLES.bankAccounts).select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลบัญชีธนาคารได้');
  }
};

exports.createBankAccount = async (req, res) => {
  try {
    const payload = cleanBankAccountPayload(req.body);
    if (!required(res, payload, ['id', 'bank_name', 'bank_short', 'account_no', 'account_name'])) return;
    const { data, error } = await supabase.from(TABLES.bankAccounts).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มบัญชีธนาคารสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มบัญชีธนาคารได้');
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const update = cleanBankAccountPayload(req.body);
    delete update.id;
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    const { data, error } = await supabase.from(TABLES.bankAccounts).update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตบัญชีธนาคารสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตบัญชีธนาคารได้');
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const { error } = await supabase.from(TABLES.bankAccounts).delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'ลบบัญชีธนาคารสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบบัญชีธนาคารได้');
  }
};
