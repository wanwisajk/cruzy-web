const { fetchOptionalTable, fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanBranchIds(body) {
  const raw = body.branchIds ?? body.branch_ids ?? body.branches ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  return [...new Set(values
    .map((value) => parseInteger(value))
    .filter((value) => value !== null))];
}

function cleanBankAccountPayload(body) {
  const bankShort = body.bankShort || body.bank_short;
  return {
    bank_name: body.bankName || body.bank_name,
    bank_short: bankShort,
    account_no: body.accountNo || body.account_no,
    account_name: body.accountName || body.account_name,
    account_type: body.accountType || body.account_type || 'ออมทรัพย์',
    color_code: body.colorCode || body.color_code || '#138F2D',
    is_active: body.isActive === undefined ? body.is_active !== false : Boolean(body.isActive)
  };
}

function attachBranches(accounts, mappings) {
  const map = mappings.reduce((acc, row) => {
    const key = String(row.bank_account_id);
    const current = acc.get(key) || [];
    current.push(row.branch_id);
    acc.set(key, current);
    return acc;
  }, new Map());

  return accounts.map((account) => ({
    ...account,
    branch_ids: map.get(String(account.id)) || []
  }));
}

async function fetchBankAccountBranches(accountIds = []) {
  if (!accountIds.length) return [];
  return fetchOptionalTable(TABLES.bankAccountBranches, 'bank_account_id, branch_id', {
    filters: { column: 'bank_account_id', operator: 'in', value: accountIds }
  });
}

async function syncBankAccountBranches(accountId, branchIds) {
  if (!Array.isArray(branchIds)) return;
  const { error: deleteError } = await supabase
    .from(TABLES.bankAccountBranches)
    .delete()
    .eq('bank_account_id', accountId);
  if (deleteError) throw deleteError;

  if (!branchIds.length) return;
  const rows = branchIds.map((branchId) => ({ bank_account_id: accountId, branch_id: branchId }));
  const { error: insertError } = await supabase.from(TABLES.bankAccountBranches).insert(rows);
  if (insertError) throw insertError;
}

async function withBankAccountBranches(account) {
  if (!account?.id) return account;
  const mappings = await fetchBankAccountBranches([account.id]);
  return attachBranches([account], mappings)[0];
}

exports.listBankAccounts = async (_req, res) => {
  try {
    const accounts = await fetchTable(TABLES.bankAccounts, '*', {
      order: [
        { column: 'is_active', ascending: false },
        { column: 'bank_short', ascending: true }
      ]
    });
    const mappings = await fetchBankAccountBranches(accounts.map((account) => account.id));
    res.json(attachBranches(accounts, mappings));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลบัญชีธนาคารได้');
  }
};

exports.getBankAccount = async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLES.bankAccounts).select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(await withBankAccountBranches(data));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลบัญชีธนาคารได้');
  }
};

exports.createBankAccount = async (req, res) => {
  try {
    const payload = cleanBankAccountPayload(req.body);
    if (!required(res, payload, ['bank_name', 'bank_short', 'account_no', 'account_name'])) return;
    const { data, error } = await supabase.from(TABLES.bankAccounts).insert([payload]).select().single();
    if (error) throw error;
    const branchIds = cleanBranchIds(req.body);
    try {
      if (branchIds.length) await syncBankAccountBranches(data.id, branchIds);
    } catch (syncError) {
      await supabase.from(TABLES.bankAccounts).delete().eq('id', data.id);
      throw syncError;
    }
    res.status(201).json({ message: 'เพิ่มบัญชีธนาคารสำเร็จ', data: await withBankAccountBranches(data) });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มบัญชีธนาคารได้');
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const update = cleanBankAccountPayload(req.body);
    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);
    const { data, error } = await supabase.from(TABLES.bankAccounts).update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (req.body.branchIds !== undefined || req.body.branch_ids !== undefined || req.body.branches !== undefined) {
      await syncBankAccountBranches(data.id, cleanBranchIds(req.body));
    }
    res.json({ message: 'อัปเดตบัญชีธนาคารสำเร็จ', data: await withBankAccountBranches(data) });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตบัญชีธนาคารได้');
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    await supabase.from(TABLES.bankAccountBranches).delete().eq('bank_account_id', req.params.id);
    const { error } = await supabase.from(TABLES.bankAccounts).delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'ลบบัญชีธนาคารสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบบัญชีธนาคารได้');
  }
};
