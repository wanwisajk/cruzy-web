const crypto = require('crypto');
const supabase = require('../config/supabase');

const TABLES = {
  regions: 'regions',
  branches: 'branches',
  employees: 'employees',
  employeeBranchEligibility: 'employee_branch_eligibility',
  employeeAvailabilityRules: 'employee_availability_rules',
  employeeAvailabilityOverrides: 'employee_availability_overrides',
  employeePayProfiles: 'employee_pay_profiles',
  branchStaffingRules: 'branch_staffing_rules',
  schedules: 'schedules',
  leaves: 'leaves',
  leaveBalances: 'leave_balances',
  contracts: 'contracts',
  sales: 'sales',
  cashDeposits: 'cash_deposits',
  attendance: 'attendance',
  attendanceAlerts: 'attendance_alerts',
  bankAccounts: 'bank_accounts',
  storeInspections: 'store_inspections',
  warningLetterTemplates: 'warning_letter_templates',
  warningLetters: 'warning_letters',
  users: 'users'
};

async function fetchTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

async function fetchOptionalTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    const missingCodes = ['42P01', 'PGRST205'];
    if (missingCodes.includes(error.code) || String(error.message || '').includes('does not exist')) {
      console.warn(`optional table skipped: ${table}`);
      return [];
    }
    throw error;
  }
  return data || [];
}

function normalizeUser(row) {
  const scope = row.scope_type === 'all' ? 'all' : row.scope_value;
  const labelMap = { owner: 'Owner', regional: 'Regional', branch: 'Branch' };
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    label: labelMap[row.role] || row.role,
    scopeType: row.scope_type,
    scope
  };
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (inputPassword === storedPassword) return true;
  const sha256 = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return sha256 === storedPassword;
}

function required(res, body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    res.status(400).json({ message: `ข้อมูลไม่ครบถ้วน: ${missing.join(', ')}` });
    return false;
  }
  return true;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanEmployeePayload(body) {
  return {
    id: body.id,
    name: body.name,
    code: body.code,
    color: body.color || body.c || '#4CAF50',
    position: body.position || body.pos || null,
    salary: body.salary === undefined ? null : toNumber(body.salary),
    status: body.status || 'active',
    region_id: body.regionId || body.region_id || null
  };
}

function cleanBranchEligibilityPayload(employeeId, row) {
  return {
    employee_id: employeeId,
    branch_id: row.branchId || row.branch_id,
    can_work: row.canWork === undefined ? row.can_work !== false : Boolean(row.canWork),
    is_preferred: row.isPreferred === undefined ? Boolean(row.is_preferred) : Boolean(row.isPreferred),
    priority: toNumber(row.priority, 0),
    commission_eligible: row.commissionEligible === undefined ? row.commission_eligible !== false : Boolean(row.commissionEligible),
    note: row.note || null
  };
}

function cleanAvailabilityRulePayload(employeeId, row) {
  return {
    employee_id: employeeId,
    day_of_week: toNumber(row.dayOfWeek ?? row.day_of_week),
    availability_type: row.availabilityType || row.availability_type || 'available',
    start_time: row.startTime || row.start_time || null,
    end_time: row.endTime || row.end_time || null,
    note: row.note || null
  };
}

function cleanPayProfilePayload(employeeId, body) {
  const payType = body.payType || body.pay_type || 'monthly';
  const monthlySalary = toNumber(body.monthlySalary ?? body.monthly_salary ?? body.salary, 0);
  const dailyRate = toNumber(body.dailyRate ?? body.daily_rate, 0);
  return {
    employee_id: employeeId,
    pay_type: payType,
    monthly_salary: payType === 'monthly' ? monthlySalary : 0,
    daily_rate: payType === 'daily' ? dailyRate : 0,
    commission_enabled: body.commissionEnabled === undefined ? body.commission_enabled !== false : Boolean(body.commissionEnabled),
    effective_from: body.effectiveFrom || body.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: body.effectiveTo || body.effective_to || null,
    is_active: body.isActive === undefined ? body.is_active !== false : Boolean(body.isActive)
  };
}

async function saveEmployeeWorkRules(employeeId, body) {
  if (Array.isArray(body.branchEligibility)) {
    const { error: deleteError } = await supabase
      .from(TABLES.employeeBranchEligibility)
      .delete()
      .eq('employee_id', employeeId);
    if (deleteError) throw deleteError;

    const rows = body.branchEligibility
      .map((row) => cleanBranchEligibilityPayload(employeeId, row))
      .filter((row) => row.branch_id);
    if (rows.length) {
      const { error } = await supabase.from(TABLES.employeeBranchEligibility).insert(rows);
      if (error) throw error;
    }
  }

  if (Array.isArray(body.availabilityRules)) {
    const { error: deleteError } = await supabase
      .from(TABLES.employeeAvailabilityRules)
      .delete()
      .eq('employee_id', employeeId);
    if (deleteError) throw deleteError;

    const rows = body.availabilityRules
      .map((row) => cleanAvailabilityRulePayload(employeeId, row))
      .filter((row) => Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6);
    if (rows.length) {
      const { error } = await supabase.from(TABLES.employeeAvailabilityRules).insert(rows);
      if (error) throw error;
    }
  }

  if (body.payProfile) {
    const { error: oldProfileError } = await supabase
      .from(TABLES.employeePayProfiles)
      .update({ is_active: false, effective_to: new Date().toISOString().slice(0, 10) })
      .eq('employee_id', employeeId)
      .eq('is_active', true);
    if (oldProfileError) throw oldProfileError;

    const payload = cleanPayProfilePayload(employeeId, body.payProfile);
    const { error } = await supabase.from(TABLES.employeePayProfiles).insert([payload]);
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const duplicateKey = msg.includes('duplicate') || msg.includes('unique');
      if (duplicateKey) {
        const { error: updateError } = await supabase
          .from(TABLES.employeePayProfiles)
          .update(payload)
          .eq('employee_id', employeeId)
          .eq('effective_from', payload.effective_from);
        if (updateError) throw updateError;
      } else {
        throw error;
      }
    }
  }
}

async function trySaveEmployeeWorkRules(employeeId, body) {
  try {
    await saveEmployeeWorkRules(employeeId, body);
    return [];
  } catch (error) {
    console.error('employee work rules save failed:', error);
    return [{
      message: 'บันทึกข้อมูลพนักงานหลักสำเร็จ แต่บันทึกกติกาสาขา/วันว่าง/เงินเดือนไม่ครบ',
      error: error.message,
      code: error.code || null
    }];
  }
}

function cleanBankAccountPayload(body) {
  return {
    id: body.id || `bank_${Date.now()}`,
    bank_name: body.bankName || body.bank_name,
    bank_short: body.bankShort || body.bank_short,
    account_no: body.accountNo || body.account_no,
    account_name: body.accountName || body.account_name,
    account_type: body.accountType || body.account_type || 'ออมทรัพย์',
    color_code: body.colorCode || body.color_code || '#138F2D',
    is_active: body.isActive === undefined ? body.is_active !== false : Boolean(body.isActive)
  };
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!required(res, req.body, ['username', 'password'])) return;

    const { data, error } = await supabase
      .from(TABLES.users)
      .select('id, username, password_hash, name, role, scope_type, scope_value')
      .eq('username', username)
      .limit(1);

    if (error) throw error;
    const user = data?.[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }
    res.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error('login failed:', error);
    res.status(500).json({ message: 'ไม่สามารถเข้าสู่ระบบได้', error: error.message });
  }
};

exports.getConsoleData = async (_req, res) => {
  try {
    const entries = Object.entries(TABLES);
    const rows = await Promise.all(entries.map(([key, table]) => {
      const select = key === 'users'
        ? 'id, username, name, role, scope_type, scope_value, created_at'
        : '*';
      const optional = [
        'employeeBranchEligibility',
        'employeeAvailabilityRules',
        'employeeAvailabilityOverrides',
        'employeePayProfiles',
        'branchStaffingRules'
      ].includes(key);
      return optional ? fetchOptionalTable(table, select) : fetchTable(table, select);
    }));

    const payload = Object.fromEntries(entries.map(([key], index) => [key, rows[index]]));
    payload.users = payload.users.map(normalizeUser);
    res.json(payload);
  } catch (error) {
    console.error('console data failed:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Console ได้', error: error.message });
  }
};

exports.listEmployees = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.employees));
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลพนักงานได้', error: error.message });
  }
};

exports.listBranches = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.branches));
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสาขาได้', error: error.message });
  }
};

exports.createBankAccount = async (req, res) => {
  try {
    const payload = cleanBankAccountPayload(req.body);
    if (!required(res, payload, ['id', 'bank_name', 'bank_short', 'account_no', 'account_name'])) return;

    const { data, error } = await supabase
      .from(TABLES.bankAccounts)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มบัญชีธนาคารสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถเพิ่มบัญชีธนาคารได้', error: error.message });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const update = {};
    if (req.body.bankName !== undefined || req.body.bank_name !== undefined) update.bank_name = req.body.bankName || req.body.bank_name;
    if (req.body.bankShort !== undefined || req.body.bank_short !== undefined) update.bank_short = req.body.bankShort || req.body.bank_short;
    if (req.body.accountNo !== undefined || req.body.account_no !== undefined) update.account_no = req.body.accountNo || req.body.account_no;
    if (req.body.accountName !== undefined || req.body.account_name !== undefined) update.account_name = req.body.accountName || req.body.account_name;
    if (req.body.accountType !== undefined || req.body.account_type !== undefined) update.account_type = req.body.accountType || req.body.account_type;
    if (req.body.colorCode !== undefined || req.body.color_code !== undefined) update.color_code = req.body.colorCode || req.body.color_code;
    if (req.body.isActive !== undefined || req.body.is_active !== undefined) update.is_active = req.body.isActive === undefined ? Boolean(req.body.is_active) : Boolean(req.body.isActive);

    const { data, error } = await supabase
      .from(TABLES.bankAccounts)
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'อัปเดตบัญชีธนาคารสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตบัญชีธนาคารได้', error: error.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    if (!required(res, req.body, ['id', 'name', 'code'])) return;
    const employee = cleanEmployeePayload(req.body);

    const { data, error } = await supabase.from(TABLES.employees).insert([employee]).select().single();
    if (error) throw error;

    const { error: balanceError } = await supabase.from(TABLES.leaveBalances).upsert([{
      employee_id: data.id,
      annual_remaining: toNumber(req.body.annualRemaining, 6),
      vacation_remaining: toNumber(req.body.vacationRemaining, 6),
      sick_used: 0,
      personal_used: 0,
      updated_at: new Date().toISOString()
    }], { onConflict: 'employee_id' });
    if (balanceError) throw balanceError;

    const warnings = await trySaveEmployeeWorkRules(data.id, req.body);

    res.status(201).json({ message: warnings.length ? 'เพิ่มพนักงานสำเร็จบางส่วน' : 'เพิ่มพนักงานสำเร็จ', data, warnings });
  } catch (error) {
    console.error('create employee failed:', error);
    const status = error.code === '23505' ? 409 : 500;
    const message = error.code === '23505'
      ? 'รหัสพนักงานหรือ ID นี้มีอยู่แล้ว'
      : 'ไม่สามารถเพิ่มพนักงานได้';
    res.status(status).json({ message, error: error.message, code: error.code || null });
  }
};

exports.saveEmployeeWorkRules = async (req, res) => {
  try {
    const employeeId = req.params.id;
    console.log('saveEmployeeWorkRules', { employeeId, body: req.body });
    await saveEmployeeWorkRules(employeeId, req.body);
    res.json({ message: 'อัปเดตกติกาพนักงานสำเร็จ' });
  } catch (error) {
    console.error('saveEmployeeWorkRules failed:', error);
    res.status(500).json({ message: 'ไม่สามารถอัปเดตกติกาพนักงานได้', error: error.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = {};
    if (req.body.name !== undefined) employee.name = req.body.name;
    if (req.body.code !== undefined) employee.code = req.body.code;
    if (req.body.color !== undefined || req.body.c !== undefined) employee.color = req.body.color || req.body.c;
    if (req.body.position !== undefined || req.body.pos !== undefined) employee.position = req.body.position || req.body.pos;
    if (req.body.salary !== undefined) employee.salary = toNumber(req.body.salary);
    if (req.body.status !== undefined) employee.status = req.body.status;
    if (req.body.regionId !== undefined || req.body.region_id !== undefined) employee.region_id = req.body.regionId || req.body.region_id;

    const { data, error } = await supabase
      .from(TABLES.employees)
      .update(employee)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'อัปเดตพนักงานสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตพนักงานได้', error: error.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { error } = await supabase.from(TABLES.employees).delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'ลบพนักงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถลบพนักงานได้', error: error.message });
  }
};

exports.getScheduleMap = async (_req, res) => {
  try {
    const schedules = await fetchTable(TABLES.schedules);
    const map = {};
    schedules.forEach((row) => {
      const key = `${row.branch_id}_${row.work_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(row.employee_id);
    });
    res.json(map);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงตารางงานได้', error: error.message });
  }
};

exports.assignSchedule = async (req, res) => {
  try {
    const { bid, date, eid, shiftStart, shiftEnd, force } = req.body;
    if (!required(res, req.body, ['bid', 'date', 'eid'])) return;

    if (!force) {
      const { data: allowed, error: allowedError } = await supabase
        .from(TABLES.employeeBranchEligibility)
        .select('id, can_work')
        .eq('employee_id', eid)
        .eq('branch_id', bid)
        .eq('can_work', true)
        .limit(1);
      if (allowedError && !['42P01', 'PGRST205'].includes(allowedError.code)) throw allowedError;
      if (!allowedError && !(allowed || []).length) {
        const { data: anyEligibility, error: anyEligibilityError } = await supabase
          .from(TABLES.employeeBranchEligibility)
          .select('id')
          .eq('employee_id', eid)
          .limit(1);
        if (anyEligibilityError && !['42P01', 'PGRST205'].includes(anyEligibilityError.code)) throw anyEligibilityError;
        if (!anyEligibilityError && (anyEligibility || []).length) {
          return res.status(409).json({ message: 'พนักงานคนนี้ไม่ได้ถูกตั้งค่าให้ลงสาขานี้' });
        }
      }

      const { data: overrideRows, error: overrideError } = await supabase
        .from(TABLES.employeeAvailabilityOverrides)
        .select('id, availability_type')
        .eq('employee_id', eid)
        .eq('work_date', date)
        .limit(1);
      if (overrideError && !['42P01', 'PGRST205'].includes(overrideError.code)) throw overrideError;
      const overrideType = !overrideError ? overrideRows?.[0]?.availability_type : null;
      if (['unavailable', 'day_off'].includes(overrideType)) {
        return res.status(409).json({ message: 'พนักงานคนนี้ถูกตั้งค่าไม่ว่าง/หยุดในวันนี้' });
      }

      const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
      if (overrideType !== 'available') {
        const { data: weeklyBlocked, error: weeklyBlockedError } = await supabase
          .from(TABLES.employeeAvailabilityRules)
          .select('id, availability_type')
          .eq('employee_id', eid)
          .eq('day_of_week', dayOfWeek)
          .in('availability_type', ['unavailable', 'day_off'])
          .limit(1);
        if (weeklyBlockedError && !['42P01', 'PGRST205'].includes(weeklyBlockedError.code)) throw weeklyBlockedError;
        if (!weeklyBlockedError && (weeklyBlocked || []).length) {
          return res.status(409).json({ message: 'พนักงานคนนี้ไม่ว่างตามกติกาประจำสัปดาห์' });
        }
      }
    }

    const { data: sameDay, error: sameDayError } = await supabase
      .from(TABLES.schedules)
      .select('id, branch_id')
      .eq('employee_id', eid)
      .eq('work_date', date);
    if (sameDayError) throw sameDayError;
    if ((sameDay || []).some((row) => row.branch_id !== bid)) {
      return res.status(409).json({ message: 'พนักงานคนนี้มีตารางงานในวันนี้ที่สาขาอื่นแล้ว' });
    }
    if ((sameDay || []).some((row) => row.branch_id === bid)) {
      return res.status(409).json({ message: 'พนักงานคนนี้อยู่ในตารางนี้แล้ว' });
    }

    const { data, error } = await supabase
      .from(TABLES.schedules)
      .insert([{
        branch_id: bid,
        work_date: date,
        employee_id: eid,
        shift_start: shiftStart || null,
        shift_end: shiftEnd || null,
        status: 'planned'
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกตารางงานสำเร็จ', data });
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500;
    res.status(status).json({ message: 'ไม่สามารถบันทึกตารางงานได้', error: error.message });
  }
};

exports.removeSchedule = async (req, res) => {
  try {
    const { bid, date, eid } = req.body;
    if (!required(res, req.body, ['bid', 'date', 'eid'])) return;

    const { error } = await supabase
      .from(TABLES.schedules)
      .delete()
      .match({ branch_id: bid, work_date: date, employee_id: eid });
    if (error) throw error;
    res.json({ message: 'ลบตารางงานเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถลบตารางงานได้', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }
    const { data, error } = await supabase
      .from(TABLES.leaves)
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'อัปเดตสถานะการลาเรียบร้อยแล้ว', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตสถานะการลาได้', error: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const body = req.body;
    if (!required(res, body, ['sellDate', 'branchId'])) return;
    const payload = {
      sell_date: body.sellDate,
      branch_id: body.branchId,
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
    res.status(500).json({ message: 'ไม่สามารถบันทึกยอดขายได้', error: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const { data: existing, error: getError } = await supabase
      .from(TABLES.sales)
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (getError) throw getError;

    const fieldMap = {
      sellDate: 'sell_date',
      branchId: 'branch_id',
      cashAmount: 'cash_amount',
      transferAmount: 'transfer_amount',
      creditAmount: 'credit_amount',
      totalAmount: 'total_amount',
      ordersCount: 'orders_count'
    };
    const update = {};
    Object.entries(fieldMap).forEach(([input, column]) => {
      if (req.body[input] !== undefined) update[column] = req.body[input];
    });

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
    if (req.body.status !== undefined) {
      logs.push({
        time: new Date().toISOString(),
        by: req.body.updatedBy || req.body.confirmedBy || 'system',
        field: 'status',
        from: existing.status || null,
        to: req.body.status,
        reason: req.body.reason || ''
      });
    }
    update.edit_logs = logs;

    const { data, error } = await supabase
      .from(TABLES.sales)
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'อัปเดตยอดขายสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถอัปเดตยอดขายได้', error: error.message });
  }
};

exports.saveInspection = async (req, res) => {
  try {
    const body = req.body;
    if (!required(res, body, ['branchId', 'workDate', 'submitTime', 'inspectionItems'])) return;
    const payload = {
      branch_id: body.branchId,
      work_date: body.workDate,
      submitted_by: body.submittedBy || null,
      submit_time: body.submitTime,
      status: body.status || 'pass',
      inspection_items: body.inspectionItems,
      reviewed_by: body.reviewedBy || null,
      review_time: body.reviewTime || null,
      manager_note: body.managerNote || null
    };
    const { data, error } = await supabase.from(TABLES.storeInspections).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกตรวจร้านสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถบันทึกตรวจร้านได้', error: error.message });
  }
};

exports.acknowledgeAlert = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.attendanceAlerts)
      .update({ is_acknowledged: true })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'รับทราบแจ้งเตือนแล้ว', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถรับทราบแจ้งเตือนได้', error: error.message });
  }
};

exports.createWarningLetter = async (req, res) => {
  try {
    const { employeeId, templateId, level, issueDate, reason, branchId, issuedBy, status } = req.body;
    if (!required(res, req.body, ['employeeId', 'level', 'issueDate', 'reason', 'issuedBy'])) return;

    const { data, error } = await supabase
      .from(TABLES.warningLetters)
      .insert([{
        employee_id: employeeId,
        template_id: templateId || null,
        level,
        issue_date: issueDate,
        reason,
        branch_id: branchId || null,
        issued_by: issuedBy,
        status: status || 'draft',
        is_signed_by_emp: false
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'ออกหนังสือเตือนสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถออกหนังสือเตือนได้', error: error.message });
  }
};
