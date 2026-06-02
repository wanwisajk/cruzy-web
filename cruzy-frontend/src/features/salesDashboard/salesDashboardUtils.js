import { dateRange, thaiShortDate } from '../../lib/date';
import { getScopeBranches } from '../../lib/schedule';

export const tabs = [
  { id: 'sales', label: 'ยอดขายรายวัน' },
  { id: 'deposit', label: 'การฝากเงินสด' },
  { id: 'account', label: 'สรุปบัญชีธนาคาร' },
  { id: 'manage', label: 'ตั้งค่าบัญชีรับเงิน' }
];

export function money(value) {
  return Number(value || 0).toLocaleString('th-TH');
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
  return data.employees.find((employee) => employee.id === employeeId);
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

export function statusBadge(status) {
  if (status === 'draft') return { className: 'draft', label: 'รอยืนยัน' };
  if (status === 'edited') return { className: 'edited', label: 'แก้ไข' };
  return { className: 'confirmed', label: 'ยืนยัน' };
}

export function depositStatus(deposit) {
  if (!Number(deposit.deposited)) return { className: 'waiting', label: 'รอฝาก' };
  const diff = Number(deposit.deposited) - Number(deposit.expected);
  if (diff === 0) return { className: 'match', label: 'ตรง' };
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
