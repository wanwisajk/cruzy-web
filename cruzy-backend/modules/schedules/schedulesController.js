const { fetchTable, MISSING_TABLE_CODES, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

function cleanSchedulePayload(body) {
  const branchId = parseInteger(body.branchId ?? body.branch_id ?? body.bid);
  return {
    branch_id: branchId,
    employee_id: body.employeeId || body.employee_id || body.eid,
    work_date: body.workDate || body.work_date || body.date,
    shift_start: body.shiftStart || body.shift_start || null,
    shift_end: body.shiftEnd || body.shift_end || null,
    status: body.status || 'planned',
    note: body.note || null,
    is_off: body.isOff === undefined ? Boolean(body.is_off || false) : Boolean(body.isOff),
    assigned_by: body.assignedBy || body.assigned_by || null
  };
}

function isUnavailableType(type) {
  return ['unavailable', 'day_off', 'off'].includes(String(type || '').toLowerCase());
}

exports.listSchedules = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.schedules));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงตารางงานได้');
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.schedules).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงตารางงานได้');
  }
};

exports.getScheduleMap = async (_req, res) => {
  try {
    const schedules = await fetchTable(TABLES.schedules);
    const map = {};
    schedules.forEach((row) => {
      const key = `${row.branch_id}_${row.work_date}`;
      if (!map[key]) map[key] = [];
      const employeeId = String(row.employee_id);
      if (!map[key].includes(employeeId)) map[key].push(employeeId);
    });
    res.json(map);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงตารางงานได้');
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const payload = cleanSchedulePayload(req.body);
    if (!required(res, payload, ['branch_id', 'employee_id', 'work_date'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branch_id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.schedules).insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มตารางงานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มตารางงานได้', error.code === '23505' ? 409 : 500);
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanSchedulePayload(req.body);
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.branch_id === null) return res.status(400).json({ message: 'branch_id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.schedules).update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตตารางงานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตตารางงานได้');
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.schedules).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบตารางงานสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบตารางงานได้');
  }
};

exports.assignSchedule = async (req, res) => {
  try {
    const { bid: bidRaw, date, eid, shiftStart, shiftEnd, force } = req.body;
    if (!required(res, req.body, ['bid', 'date', 'eid'])) return;
    const bid = parseInteger(bidRaw);
    if (bid === null) return res.status(400).json({ message: 'bid ต้องเป็นตัวเลข' });

    if (!force) {
      const { data: allowed, error: allowedError } = await supabase
        .from(TABLES.employeeBranchEligibility)
        .select('id, can_work')
        .eq('employee_id', eid)
        .eq('branch_id', bid)
        .eq('can_work', true)
        .limit(1);
      if (allowedError && !MISSING_TABLE_CODES.includes(allowedError.code)) throw allowedError;
      if (!allowedError && !(allowed || []).length) {
        const { data: anyEligibility, error: anyEligibilityError } = await supabase
          .from(TABLES.employeeBranchEligibility)
          .select('id, branch_id')
          .eq('employee_id', eid)
          .limit(1);
        if (anyEligibilityError && !MISSING_TABLE_CODES.includes(anyEligibilityError.code)) throw anyEligibilityError;
        if (!anyEligibilityError && (anyEligibility || []).length) {
          const { data: allowedBranches, error: allowedBranchesError } = await supabase
            .from(TABLES.employeeBranchEligibility)
            .select('branch_id')
            .eq('employee_id', eid)
            .eq('can_work', true);
          if (allowedBranchesError && !MISSING_TABLE_CODES.includes(allowedBranchesError.code)) throw allowedBranchesError;
          const allowedBranchIds = (allowedBranches || anyEligibility || []).map((row) => row.branch_id).filter((id) => id !== null && id !== undefined);
          return res.status(409).json({
            message: `พนักงานคนนี้ไม่ได้ถูกตั้งค่าให้ลงสาขานี้ (DB อนุญาตสาขา: ${allowedBranchIds.join(', ') || '-'})`,
            allowedBranchIds
          });
        }
      }

      const { data: overrideRows, error: overrideError } = await supabase
        .from(TABLES.employeeAvailabilityOverrides)
        .select('id, availability_type')
        .eq('employee_id', eid)
        .eq('work_date', date)
        .limit(1);
      if (overrideError && !MISSING_TABLE_CODES.includes(overrideError.code)) throw overrideError;
      const overrideType = !overrideError ? overrideRows?.[0]?.availability_type : null;
      if (isUnavailableType(overrideType)) {
        return res.status(409).json({ message: 'พนักงานคนนี้ถูกตั้งค่าไม่ว่าง/หยุดในวันนี้' });
      }

      const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
      const { data: weeklyRules, error: weeklyError } = await supabase
        .from(TABLES.employeeAvailabilityRules)
        .select('id, availability_type')
        .eq('employee_id', eid)
        .eq('day_of_week', dayOfWeek)
        .limit(1);
      if (weeklyError && !MISSING_TABLE_CODES.includes(weeklyError.code)) throw weeklyError;
      const weeklyType = !weeklyError ? weeklyRules?.[0]?.availability_type : null;
      if (isUnavailableType(weeklyType)) {
        return res.status(409).json({ message: 'พนักงานคนนี้เป็นวันหยุดประจำสัปดาห์' });
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
      .insert([{ branch_id: bid, work_date: date, employee_id: eid, shift_start: shiftStart || null, shift_end: shiftEnd || null, status: 'planned' }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'บันทึกตารางงานสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกตารางงานได้', error.code === '23505' ? 409 : 500);
  }
};

exports.removeSchedule = async (req, res) => {
  try {
    const { bid: bidRaw, date, eid } = req.body;
    if (!required(res, req.body, ['bid', 'date', 'eid'])) return;
    const bid = parseInteger(bidRaw);
    if (bid === null) return res.status(400).json({ message: 'bid ต้องเป็นตัวเลข' });

    const { error } = await supabase.from(TABLES.schedules).delete().match({ branch_id: bid, work_date: date, employee_id: eid });
    if (error) throw error;
    res.json({ message: 'ลบตารางงานเรียบร้อยแล้ว' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบตารางงานได้');
  }
};
