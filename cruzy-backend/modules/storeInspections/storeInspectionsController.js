const { fetchOptionalTable, fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError, toNumber } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const INSPECTION_SELECT = 'id, branch_id, work_date, submitted_by, submit_time, close_time, status, inspection_items, reviewed_by, review_time, manager_note, score, photo_count, is_late, late_minutes, created_at';
const BRANCH_SELECT = 'id, name, code, region_id';
const EMPLOYEE_SELECT = 'id, name, nickname, position, line_user_id';
const SETTINGS_SELECT = 'id, branch_id, cctv_count, shelf_count, required_photos, checklists, required_products, updated_at';
const STAFFING_RULE_SELECT = 'branch_id, day_of_week, shift_start, shift_end, is_active';

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function minutesAfter(value, target) {
  const valueMinutes = timeToMinutes(value);
  const targetMinutes = timeToMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, valueMinutes - targetMinutes);
}

function minutesBefore(value, target) {
  const valueMinutes = timeToMinutes(value);
  const targetMinutes = timeToMinutes(target);
  if (valueMinutes === null || targetMinutes === null) return 0;
  return Math.max(0, targetMinutes - valueMinutes);
}

function dayOfWeek(date) {
  return new Date(`${date}T00:00:00`).getDay();
}

async function branchShiftTimes(branchId, workDate) {
  const { data } = await supabase
    .from(TABLES.branchStaffingRules)
    .select(STAFFING_RULE_SELECT)
    .eq('branch_id', branchId)
    .eq('day_of_week', dayOfWeek(workDate))
    .eq('is_active', true)
    .maybeSingle();

  return {
    start: String(data?.shift_start || '10:00').slice(0, 5),
    end: String(data?.shift_end || '21:00').slice(0, 5)
  };
}

async function saveGeneratedAlert(payload) {
  if (!payload.employee_id) return;
  const { data: existingRows, error: findError } = await supabase
    .from(TABLES.attendanceAlerts)
    .select('id')
    .eq('alert_type', payload.alert_type)
    .eq('employee_id', payload.employee_id)
    .eq('branch_id', payload.branch_id)
    .eq('work_date', payload.work_date)
    .limit(1);
  if (findError) throw findError;

  const existing = existingRows?.[0];
  if (existing?.id) {
    const updatePayload = { ...payload };
    delete updatePayload.is_acknowledged;

    const { error } = await supabase
      .from(TABLES.attendanceAlerts)
      .update(updatePayload)
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(TABLES.attendanceAlerts).insert([payload]);
  if (error) throw error;
}

async function syncInspectionAlerts(inspection) {
  if (!inspection?.branch_id || !inspection?.work_date || !inspection?.submitted_by) return;
  const shift = await branchShiftTimes(inspection.branch_id, inspection.work_date);
  const lateMinutes = Math.max(Number(inspection.late_minutes || 0), minutesAfter(inspection.submit_time, shift.start));
  const earlyMinutes = inspection.close_time ? minutesBefore(inspection.close_time, shift.end) : 0;

  if (lateMinutes > 0) {
    await saveGeneratedAlert({
      alert_type: 'late',
      employee_id: inspection.submitted_by,
      branch_id: inspection.branch_id,
      work_date: inspection.work_date,
      alert_time: inspection.submit_time || shift.start,
      title: `เปิดร้านสาย ${lateMinutes} นาที`,
      detail: `บันทึกเปิดร้านเวลา ${String(inspection.submit_time || '-').slice(0, 5)} เทียบเวลาเปิดร้าน ${shift.start}`,
      severity: lateMinutes >= 30 ? 'critical' : 'warning',
      is_acknowledged: false
    });
  }

  if (earlyMinutes > 0) {
    await saveGeneratedAlert({
      alert_type: 'closed_early',
      employee_id: inspection.submitted_by,
      branch_id: inspection.branch_id,
      work_date: inspection.work_date,
      alert_time: inspection.close_time || shift.end,
      title: `ปิดร้านก่อนเวลา ${earlyMinutes} นาที`,
      detail: `บันทึกปิดร้านเวลา ${String(inspection.close_time || '-').slice(0, 5)} เทียบเวลาปิดร้าน ${shift.end}`,
      severity: earlyMinutes >= 30 ? 'critical' : 'warning',
      is_acknowledged: false
    });
  }
}

function hasValue(body, ...keys) {
  return keys.some((key) => body[key] !== undefined);
}

function firstValue(body, ...keys) {
  const key = keys.find((item) => body[item] !== undefined);
  return key ? body[key] : undefined;
}

function cleanInspectionPayload(body, { partial = false } = {}) {
  const payload = {};
  if (hasValue(body, 'branchId', 'branch_id')) payload.branch_id = parseInteger(firstValue(body, 'branchId', 'branch_id'));
  if (hasValue(body, 'workDate', 'work_date')) payload.work_date = firstValue(body, 'workDate', 'work_date');
  if (hasValue(body, 'submittedBy', 'submitted_by')) payload.submitted_by = firstValue(body, 'submittedBy', 'submitted_by') || null;
  if (hasValue(body, 'submitTime', 'submit_time')) payload.submit_time = firstValue(body, 'submitTime', 'submit_time');
  if (hasValue(body, 'closeTime', 'close_time')) payload.close_time = firstValue(body, 'closeTime', 'close_time') || null;
  if (hasValue(body, 'status')) payload.status = body.status;
  if (hasValue(body, 'inspectionItems', 'inspection_items')) payload.inspection_items = firstValue(body, 'inspectionItems', 'inspection_items');
  if (hasValue(body, 'reviewedBy', 'reviewed_by')) payload.reviewed_by = firstValue(body, 'reviewedBy', 'reviewed_by') || null;
  if (hasValue(body, 'reviewTime', 'review_time')) payload.review_time = firstValue(body, 'reviewTime', 'review_time') || null;
  if (hasValue(body, 'managerNote', 'manager_note')) payload.manager_note = firstValue(body, 'managerNote', 'manager_note') || null;
  if (hasValue(body, 'isLate', 'is_late')) payload.is_late = Boolean(firstValue(body, 'isLate', 'is_late'));
  if (hasValue(body, 'lateMinutes', 'late_minutes')) payload.late_minutes = toNumber(firstValue(body, 'lateMinutes', 'late_minutes'), 0);
  if (hasValue(body, 'score')) payload.score = toNumber(body.score, 0);
  if (hasValue(body, 'photoCount', 'photo_count')) payload.photo_count = toNumber(firstValue(body, 'photoCount', 'photo_count'), 0);
  if (hasValue(body, 'lineNotified', 'line_notified')) payload.line_notified = Boolean(firstValue(body, 'lineNotified', 'line_notified'));
  if (!partial && !payload.status) payload.status = 'pass';
  return payload;
}

exports.listInspections = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.storeInspections, INSPECTION_SELECT, {
      order: [
        { column: 'work_date', ascending: false },
        { column: 'branch_id', ascending: true }
      ]
    }));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลตรวจร้านได้');
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const fromDate = req.query.from || req.query.from_date;
    const toDate = req.query.to || req.query.to_date;
    const branchId = req.query.branch || req.query.branch_id;
    let inspectionsQuery = supabase.from(TABLES.storeInspections).select(INSPECTION_SELECT);
    if (fromDate) inspectionsQuery = inspectionsQuery.gte('work_date', fromDate);
    if (toDate) inspectionsQuery = inspectionsQuery.lte('work_date', toDate);
    const parsedBranchId = branchId && branchId !== 'all' ? parseInteger(branchId) : null;
    if (parsedBranchId !== null) inspectionsQuery = inspectionsQuery.eq('branch_id', parsedBranchId);
    inspectionsQuery = inspectionsQuery
      .order('work_date', { ascending: false })
      .order('branch_id', { ascending: true });

    const [branches, employees, inspectionsResult, settings, staffingRules] = await Promise.all([
      fetchTable(TABLES.branches, BRANCH_SELECT, { order: [{ column: 'code', ascending: true }, { column: 'name', ascending: true }] }),
      fetchTable(TABLES.employees, EMPLOYEE_SELECT, { order: { column: 'name', ascending: true } }),
      inspectionsQuery,
      fetchOptionalTable(TABLES.inspectionSettings, SETTINGS_SELECT),
      fetchOptionalTable(TABLES.branchStaffingRules, STAFFING_RULE_SELECT)
    ]);

    if (inspectionsResult.error) throw inspectionsResult.error;

    res.json({
      branches,
      employees,
      storeInspections: inspectionsResult.data || [],
      inspectionSettings: settings,
      branchStaffingRules: staffingRules
    });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลหน้าตรวจร้านได้');
  }
};

exports.getInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลตรวจร้านได้');
  }
};

exports.saveInspection = async (req, res) => {
  try {
    const payload = cleanInspectionPayload(req.body);
    if (!required(res, payload, ['branch_id', 'work_date', 'submit_time', 'inspection_items'])) return;
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).insert([payload]).select().single();
    if (error) throw error;
    await syncInspectionAlerts(data);
    res.status(201).json({ message: 'บันทึกตรวจร้านสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถบันทึกตรวจร้านได้');
  }
};

exports.updateInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const payload = cleanInspectionPayload(req.body, { partial: true });
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    if (payload.branch_id === null) return res.status(400).json({ message: 'branchId ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.storeInspections).update(payload).eq('id', id).select().single();
    if (error) throw error;
    await syncInspectionAlerts(data);
    res.json({ message: 'อัปเดตตรวจร้านสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตตรวจร้านได้');
  }
};

exports.deleteInspection = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.storeInspections).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบข้อมูลตรวจร้านสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบข้อมูลตรวจร้านได้');
  }
};
