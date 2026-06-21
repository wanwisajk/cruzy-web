import { dateRange, thaiShortDate } from '../../lib/date';
import { getScopeBranches } from '../../lib/schedule';

export const tabs = [
  { id: 'sales', label: 'ยอดขายรายวัน' },
  { id: 'deposit', label: 'การฝากเงินสด' },
  { id: 'account', label: 'สรุปบัญชีธนาคาร' },
  { id: 'manage', label: 'ตั้งค่าบัญชีรับเงิน' }
];

export function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export function shortDate(value) {
  return value ? thaiShortDate(value) : '—';
}

export function timeText(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

export function branchById(data, branchId) {
  return data.branches.find((branch) => String(branch.id) === String(branchId));
}

export function employeeById(data, employeeId) {
  return data.employees.find((employee) => String(employee.id) === String(employeeId));
}

export function employeeByLineUserId(data, lineUserId) {
  if (!lineUserId) return null;
  return data.employees.find((employee) => String(employee.lineUserId || employee.line_user_id || '') === String(lineUserId));
}

export function employeeDisplayName(data, { employeeId, lineUserId, fallbackName } = {}) {
  const employee = employeeById(data, employeeId) || employeeByLineUserId(data, lineUserId);
  return employee?.nickname || employee?.name || fallbackName || employeeId || lineUserId || '—';
}

export function userByIdentifier(data, identifier) {
  if (!identifier) return null;
  return (data.users || []).find((user) => (
    String(user.id) === String(identifier) ||
    String(user.username) === String(identifier) ||
    String(user.name) === String(identifier)
  ));
}

export function actorDisplayName(data, identifier) {
  const user = userByIdentifier(data, identifier);
  if (!user) return identifier || '—';
  const linkedEmployee = employeeById(data, user.employeeId || user.employee_id);
  return linkedEmployee?.nickname || linkedEmployee?.name || user.name || user.username || identifier || '—';
}

export function accountById(data, accountId) {
  return data.bankAccounts.find((account) => String(account.id) === String(accountId));
}

export function visibleBranchIds(data, user, currentBranch) {
  const branches = getScopeBranches(data, user);
  if (currentBranch === 'all') return branches.map((branch) => branch.id);
  return branches.filter((branch) => String(branch.id) === String(currentBranch)).map((branch) => branch.id);
}

export function filteredSales(data, user, currentBranch, from, to) {
  const branchIds = visibleBranchIds(data, user, currentBranch).map(String);
  const dates = dateRange(from, to);
  return data.sales.filter((sale) => branchIds.includes(String(sale.bid)) && dates.includes(sale.date));
}

export function filteredDeposits(data, user, currentBranch, from, to) {
  const branchIds = visibleBranchIds(data, user, currentBranch).map(String);
  const dates = dateRange(from, to);
  return data.deposits.filter((deposit) => branchIds.includes(String(deposit.bid)) && dates.includes(deposit.date));
}

export function cashByBranchAndDate(data) {
  return data.sales.reduce((acc, sale) => {
    const branchId = String(sale.bid);
    const date = sale.date;
    const key = `${branchId}_${date}`;
    acc[key] = (acc[key] || 0) + Number(sale.cash || 0);
    return acc;
  }, {});
}

export function cashLedgerBalanceByBranch(data) {
  return (data.branchCashLedger || []).reduce((acc, row) => {
    const branchId = String(row.branchId || row.branch_id || '');
    if (!branchId) return acc;
    acc[branchId] = (acc[branchId] || 0) + Number(row.amount || 0);
    return acc;
  }, {});
}

export function cashLedgerBalanceForBranch(data, branchId) {
  return Number(cashLedgerBalanceByBranch(data)[String(branchId)] || 0);
}

export function cashLedgerLabel(balance) {
  const value = Number(balance || 0);
  if (value > 0) return { tone: 'pending', label: `ค้างฝาก ฿${money(value)}` };
  if (value < 0) return { tone: 'over', label: `เกินฝาก ฿${money(Math.abs(value))}` };
  return { tone: 'clear', label: 'เคลียร์พอดี' };
}

export function statusBadge(status) {
  if (status === 'draft') return { className: 'draft', label: 'รอยืนยัน' };
  if (status === 'edited') return { className: 'edited', label: 'แก้ไข' };
  return { className: 'confirmed', label: 'ยืนยัน' };
}

export function depositStatus(deposit, expectedOverride = null) {
  if (!Number(deposit.deposited)) return { className: 'waiting', label: 'รอฝาก' };
  const expected = expectedOverride === null || expectedOverride === undefined ? Number(deposit.expected) : Number(expectedOverride);
  const diff = Number(deposit.deposited) - expected;
  if (Math.abs(diff) < 0.01) return { className: 'match', label: 'ตรง' };
  return { className: 'mismatch', label: `ยอด${diff > 0 ? 'เกิน' : 'ขาด'} ฿${money(Math.abs(diff))}` };
}

export function rawSalesText(sale) {
  if (sale.rawText) return sale.rawText;
  return [
    `ยอดขายวันที่ ${shortDate(sale.date)}`,
    `ยอดเงินสด = ${money(sale.cash)}`,
    `ยอดโอน/QR = ${money(Number(sale.transfer || 0) + Number(sale.qr || 0))}`,
    `ยอดบัตร CREDIT = ${money(sale.credit)}`,
    `ยอดรวม = ${money(sale.total)}`
  ].join('\n');
}
