const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanEmployeePayload(body) {
  return {
    id: body.id,
    name: body.name,
    color: body.color || body.c || '#4CAF50',
    position: body.position || body.pos || null,
    salary: body.salary === undefined ? null : toNumber(body.salary),
    region_id: parseInteger(body.regionId ?? body.region_id),
    nickname: body.nickname || null,
    phone: body.phone || null,
    line_user_id: body.line_user_id || null
  };
}

function cleanBranchEligibilityPayload(employeeId, row) {
  return {
    employee_id: employeeId,
    branch_id: parseInteger(row.branchId ?? row.branch_id),
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

function cleanAvailabilityOverridePayload(employeeId, row) {
  return {
    employee_id: employeeId,
    work_date: row.workDate || row.work_date,
    availability_type: row.availabilityType || row.availability_type || 'day_off',
    start_time: row.startTime || row.start_time || null,
    end_time: row.endTime || row.end_time || null,
    reason: row.reason || null
  };
}

function cleanPayProfilePayload(employeeId, body) {
  const payType = body.payType || body.pay_type || 'monthly';
  const monthlySalary = toNumber(body.monthlySalary ?? body.monthly_salary ?? body.salary, 0);
  const dailyRate = toNumber(body.dailyRate ?? body.daily_rate ?? body.salary, 0);
  let rawAbsenceMode = body.absDeduct || body.absence_deduct_mode || body.absenceDeductMode || 'system_hourly_avg';
  let absenceDeductMode = null;
  let absenceSystemCalc = body.absenceSystemCalc || body.absence_system_calc || null;

  if (rawAbsenceMode === 'system_hourly_avg') {
    absenceDeductMode = 'system';
    absenceSystemCalc = 'hourly_avg';
  } else if (rawAbsenceMode === 'system_hourly_fixed') {
    absenceDeductMode = 'system';
    absenceSystemCalc = 'hourly_fixed';
  } else if (rawAbsenceMode === 'fixed_per_day') {
    absenceDeductMode = 'fixed';
    absenceSystemCalc = null;
  } else if (rawAbsenceMode === 'system') {
    absenceDeductMode = 'system';
    absenceSystemCalc = absenceSystemCalc || 'hourly_avg';
  } else if (rawAbsenceMode === 'fixed') {
    absenceDeductMode = 'fixed';
    absenceSystemCalc = null;
  }

  if (!absenceDeductMode) {
    throw new Error(`Invalid absence_deduct_mode: ${JSON.stringify(rawAbsenceMode)}.`);
  }

  return {
    employee_id: employeeId,
    pay_type: payType,
    pay_cycle: body.payCycle || body.pay_cycle || 'monthly',
    monthly_salary: payType === 'monthly' ? monthlySalary : 0,
    daily_rate: payType === 'daily' ? dailyRate : 0,
    commission_enabled: body.commissionEnabled === undefined ? body.commission_enabled !== false : Boolean(body.commissionEnabled),
    break_hours: body.breakHours !== undefined ? parseFloat(body.breakHours) : body.break_hours !== undefined ? parseFloat(body.break_hours) : 1,
    absence_deduct_mode: absenceDeductMode,
    absence_system_calc: absenceSystemCalc,
    absence_deduct_value: body.absFixed !== undefined ? toNumber(body.absFixed) : body.absence_deduct_value !== undefined ? toNumber(body.absence_deduct_value) : null,
    effective_from: body.effectiveFrom || body.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: body.effectiveTo || body.effective_to || null,
    is_active: body.isActive === undefined ? body.is_active !== false : Boolean(body.isActive)
  };
}

async function saveWorkRules(employeeId, body) {
  if (Array.isArray(body.branchEligibility)) {
    const { error: deleteError } = await supabase.from(TABLES.employeeBranchEligibility).delete().eq('employee_id', employeeId);
    if (deleteError) throw deleteError;
    const rows = body.branchEligibility.map((row) => cleanBranchEligibilityPayload(employeeId, row)).filter((row) => row.branch_id);
    if (rows.length) {
      const { error } = await supabase.from(TABLES.employeeBranchEligibility).insert(rows);
      if (error) throw error;
    }
  }

  if (Array.isArray(body.availabilityRules)) {
    const { error: deleteError } = await supabase.from(TABLES.employeeAvailabilityRules).delete().eq('employee_id', employeeId);
    if (deleteError) throw deleteError;
    const rows = body.availabilityRules
      .map((row) => cleanAvailabilityRulePayload(employeeId, row))
      .filter((row) => Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6);
    if (rows.length) {
      const { error } = await supabase.from(TABLES.employeeAvailabilityRules).insert(rows);
      if (error) throw error;
    }
  }

  if (Array.isArray(body.availabilityOverrides)) {
    const { error: deleteError } = await supabase.from(TABLES.employeeAvailabilityOverrides).delete().eq('employee_id', employeeId);
    if (deleteError) throw deleteError;
    const rows = body.availabilityOverrides.map((row) => cleanAvailabilityOverridePayload(employeeId, row)).filter((row) => row.work_date);
    if (rows.length) {
      const { error } = await supabase.from(TABLES.employeeAvailabilityOverrides).insert(rows);
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
    if (error) throw error;
  }
}

async function deleteEmployeeCascade(employeeId) {
  const operations = [
    supabase.from(TABLES.schedules).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.attendanceAlerts).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.attendance).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.storeInspections).delete().eq('submitted_by', employeeId),
    supabase.from(TABLES.warningLetters).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.leaves).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.contracts).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.employeePayProfiles).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.employeeBranchEligibility).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.employeeAvailabilityRules).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.employeeAvailabilityOverrides).delete().eq('employee_id', employeeId),
    supabase.from(TABLES.leaveBalances).delete().eq('employee_id', employeeId)
  ];

  for (const op of operations) {
    const { error } = await op;
    if (error) console.error('deleteEmployeeCascade error:', error);
  }
}

exports.listEmployees = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.employees));
  } catch (error) {
    console.error('listEmployees failed:', error);
    sendError(res, error, 'ไม่สามารถดึงข้อมูลพนักงานได้');
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLES.employees).select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลพนักงานได้');
  }
};

exports.createEmployee = async (req, res) => {
  let employeeId = null;
  try {
    if (!required(res, req.body, ['id', 'name', 'branchEligibility', 'payProfile'])) return;
    if (!Array.isArray(req.body.branchEligibility) || req.body.branchEligibility.length === 0) {
      return res.status(400).json({ message: 'ต้องระบุสาขาที่พนักงานสามารถทำงานได้อย่างน้อย 1 สาขา' });
    }

    const employee = cleanEmployeePayload(req.body);
    const { data, error } = await supabase.from(TABLES.employees).insert([employee]).select().single();
    if (error) throw error;
    employeeId = data.id;

    const { error: balanceError } = await supabase.from(TABLES.leaveBalances).upsert([{
      employee_id: employeeId,
      annual_remaining: toNumber(req.body.annualRemaining, 6),
      vacation_remaining: toNumber(req.body.vacationRemaining, 6),
      sick_used: 0,
      personal_used: 0,
      updated_at: new Date().toISOString()
    }], { onConflict: 'employee_id' });
    if (balanceError) throw balanceError;

    await saveWorkRules(employeeId, req.body);
    res.status(201).json({ message: 'เพิ่มพนักงานสำเร็จ', data });
  } catch (error) {
    console.error('createEmployee failed:', error);
    if (employeeId) {
      await deleteEmployeeCascade(employeeId);
      await supabase.from(TABLES.employees).delete().eq('id', employeeId);
    }
    const status = error.code === '23505' ? 409 : 500;
    const message = error.code === '23505' ? 'รหัสพนักงานหรือ ID นี้มีอยู่แล้ว' : 'ไม่สามารถเพิ่มพนักงานได้';
    sendError(res, error, message, status);
  }
};

exports.saveEmployeeWorkRules = async (req, res) => {
  try {
    await saveWorkRules(req.params.id, req.body);
    res.json({ message: 'อัปเดตกติกาพนักงานสำเร็จ' });
  } catch (error) {
    console.error('saveEmployeeWorkRules failed:', error);
    sendError(res, error, 'ไม่สามารถอัปเดตกติกาพนักงานได้');
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = {};
    if (req.body.name !== undefined) employee.name = req.body.name;
    if (req.body.color !== undefined || req.body.c !== undefined) employee.color = req.body.color || req.body.c;
    if (req.body.position !== undefined || req.body.pos !== undefined) employee.position = req.body.position || req.body.pos;
    if (req.body.salary !== undefined) employee.salary = toNumber(req.body.salary);
    if (req.body.nickname !== undefined) employee.nickname = req.body.nickname;
    if (req.body.phone !== undefined) employee.phone = req.body.phone;
    if (req.body.line_user_id !== undefined) employee.line_user_id = req.body.line_user_id;
    if (req.body.regionId !== undefined || req.body.region_id !== undefined) {
      const regionId = parseInteger(req.body.regionId ?? req.body.region_id);
      if (regionId === null) return res.status(400).json({ message: 'region_id ต้องเป็นตัวเลข' });
      employee.region_id = regionId;
    }

    const { data, error } = await supabase.from(TABLES.employees).update(employee).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตพนักงานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตพนักงานได้');
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    await deleteEmployeeCascade(req.params.id);
    const { error } = await supabase.from(TABLES.employees).delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'ลบพนักงานสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบพนักงานได้');
  }
};
