const { supabase } = require('./db');
const TABLES = require('./tables');

function isMissingLedgerTable(error) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
  return /PGRST205|PGRST204|branch_cash_ledger|Could not find the table|schema cache/i.test(text);
}

function amountOf(value) {
  const amount = Number(String(value || 0).replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

async function findLedgerEntry(match) {
  const { data, error } = await supabase
    .from(TABLES.branchCashLedger)
    .select('id')
    .match(match)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertLedgerEntry(match, payload) {
  try {
    const existing = await findLedgerEntry(match);
    const query = existing
      ? supabase.from(TABLES.branchCashLedger).update(payload).eq('id', existing.id)
      : supabase.from(TABLES.branchCashLedger).insert([payload]);
    const { error } = await query;
    if (error?.code === '23505') {
      const retry = await supabase.from(TABLES.branchCashLedger).update(payload).match(match);
      if (retry.error) throw retry.error;
      return;
    }
    if (error) throw error;
  } catch (error) {
    if (isMissingLedgerTable(error)) {
      console.warn('branch_cash_ledger is not ready, skipped ledger sync');
      return;
    }
    console.error('sync branch_cash_ledger failed:', error);
  }
}

async function deleteLedgerEntry(referenceColumn, referenceValue, entryType = null) {
  try {
    let query = supabase.from(TABLES.branchCashLedger).delete().eq(referenceColumn, referenceValue);
    if (entryType) query = query.eq('entry_type', entryType);
    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    if (isMissingLedgerTable(error)) return;
    console.error('delete branch_cash_ledger entry failed:', error);
  }
}

async function syncSaleCashLedger(sale) {
  if (!sale?.id) return;
  const amount = amountOf(sale.cash_amount ?? sale.cashAmount ?? sale.cash);
  if (sale.status === 'rejected' || Math.abs(amount) < 0.005) {
    await deleteLedgerEntry('sale_id', sale.id, 'sale_cash');
    return;
  }

  await upsertLedgerEntry({ sale_id: sale.id, entry_type: 'sale_cash' }, {
    branch_id: sale.branch_id ?? sale.branchId ?? sale.bid,
    ledger_date: sale.sell_date ?? sale.sellDate ?? sale.date,
    entry_type: 'sale_cash',
    sale_id: sale.id,
    cash_deposit_id: null,
    amount,
    note: null
  });
}

async function syncDepositCashLedger(deposit) {
  if (!deposit?.id) return;
  const amount = amountOf(deposit.deposited_amount ?? deposit.depositedAmount ?? deposit.deposited);
  if (deposit.status === 'rejected' || Math.abs(amount) < 0.005) {
    await deleteLedgerEntry('cash_deposit_id', deposit.id, 'deposit');
    return;
  }

  await upsertLedgerEntry({ cash_deposit_id: deposit.id, entry_type: 'deposit' }, {
    branch_id: deposit.branch_id ?? deposit.branchId ?? deposit.bid,
    ledger_date: deposit.deposit_date ?? deposit.depositDate ?? deposit.date,
    entry_type: 'deposit',
    sale_id: null,
    cash_deposit_id: deposit.id,
    amount: -amount,
    note: null
  });
}

module.exports = {
  syncSaleCashLedger,
  syncDepositCashLedger,
  deleteLedgerEntry
};
