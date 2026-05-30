const crypto = require('crypto');
const supabase = require('../config/supabase');

const TABLES = {
  regions: 'regions',
  branches: 'branches',
  employees: 'employees',
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
      return fetchTable(table, select);
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

    res.status(201).json({ message: 'เพิ่มพนักงานสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถเพิ่มพนักงานได้', error: error.message });
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
    const { bid, date, eid } = req.body;
    if (!required(res, req.body, ['bid', 'date', 'eid'])) return;

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
      .insert([{ branch_id: bid, work_date: date, employee_id: eid }])
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
