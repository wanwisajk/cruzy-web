const { fetchOptionalTable, fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

const DAY_MAP = { จ: 1, อ: 2, พ: 3, พฤ: 4, ศ: 5, ส: 6, อา: 0 };
const DEFAULT_BRANCH_HOURS = { จ: '10:00', อ: '10:00', พ: '10:00', พฤ: '10:00', ศ: '10:00', ส: '10:00', อา: '10:00' };
const DEFAULT_BRANCH_CLOSE = { จ: '21:00', อ: '21:00', พ: '21:00', พฤ: '21:00', ศ: '21:00', ส: '21:00', อา: '21:00' };
const DAY_NUMBER_TO_KEY = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' };
const STAFFING_RULE_SELECT = 'branch_id, day_of_week, required_staff, shift_start, shift_end';
const BRANCH_SELECT = 'id, name, code, region_id, regions(id, name)';

function normalizeBranch(branch) {
  if (!branch) return branch;
  const region = Array.isArray(branch.regions) ? branch.regions[0] : branch.regions;
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    region_id: branch.region_id,
    region_name: region?.name || ''
  };
}

function extractStaffingRules(branchId, form) {
  return Object.entries(DAY_MAP).map(([dayAbbr, dayOfWeek]) => {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const requiredStaff = isWeekend ? (form.minWeekend || 1) : (form.minWeekday || 1);
    const shiftStart = form.hours?.[dayAbbr] || '10:00';
    const shiftEnd = form.hoursEnd?.[dayAbbr] || '21:00';
    return {
      branch_id: branchId,
      day_of_week: dayOfWeek,
      required_staff: requiredStaff,
      shift_start: `${shiftStart}:00`,
      shift_end: `${shiftEnd}:00`,
      is_active: true
    };
  });
}

function groupStaffingRules(rules) {
  return rules.reduce((groups, rule) => {
    const branchRules = groups.get(rule.branch_id) || [];
    branchRules.push(rule);
    groups.set(rule.branch_id, branchRules);
    return groups;
  }, new Map());
}

function mergeBranchStaffing(branches, rulesOrGroups) {
  const rulesByBranch = rulesOrGroups instanceof Map ? rulesOrGroups : groupStaffingRules(rulesOrGroups);

  return branches.map((branch) => {
    const branchRules = rulesByBranch.get(branch.id) || [];
    const hours = { ...DEFAULT_BRANCH_HOURS };
    const hoursEnd = { ...DEFAULT_BRANCH_CLOSE };
    let minWeekday = 1;
    let minWeekend = 1;

    branchRules.forEach((rule) => {
      const dayKey = DAY_NUMBER_TO_KEY[rule.day_of_week];
      if (dayKey) {
        hours[dayKey] = (rule.shift_start || '10:00:00').slice(0, 5);
        hoursEnd[dayKey] = (rule.shift_end || '21:00:00').slice(0, 5);
      }
      if ([1, 2, 3, 4, 5].includes(rule.day_of_week)) {
        minWeekday = Math.max(minWeekday, Number(rule.required_staff) || 1);
      } else if ([6, 0].includes(rule.day_of_week)) {
        minWeekend = Math.max(minWeekend, Number(rule.required_staff) || 1);
      }
    });

    return { ...branch, minWeekday, minWeekend, hours, hoursEnd };
  });
}

exports.listBranches = async (_req, res) => {
  try {
    const [branches, staffingRules] = await Promise.all([
      fetchTable(TABLES.branches, BRANCH_SELECT, { order: [{ column: 'code', ascending: true }, { column: 'name', ascending: true }] }),
      fetchOptionalTable(TABLES.branchStaffingRules, STAFFING_RULE_SELECT)
    ]);
    res.json(mergeBranchStaffing(branches.map(normalizeBranch), groupStaffingRules(staffingRules)));
  } catch (error) {
    console.error('listBranches failed:', error);
    sendError(res, error, 'ไม่สามารถดึงข้อมูลสาขาได้');
  }
};

exports.getBranch = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.branches).select(BRANCH_SELECT).eq('id', id).single();
    if (error) throw error;
    const rules = await fetchOptionalTable(TABLES.branchStaffingRules, STAFFING_RULE_SELECT, {
      filters: [{ column: 'branch_id', value: id }]
    });
    res.json(mergeBranchStaffing([normalizeBranch(data)], rules)[0]);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลสาขาได้');
  }
};

exports.createBranch = async (req, res) => {
  try {
    const payload = req.body;
    if (!required(res, payload, ['name', 'code', 'region_id'])) return;
    const regionId = parseInteger(payload.region_id ?? payload.regionId);
    if (regionId === null) return res.status(400).json({ message: 'region_id ต้องเป็นตัวเลข' });

    const { data, error } = await supabase
      .from(TABLES.branches)
      .insert([{ name: payload.name, code: payload.code, region_id: regionId }])
      .select(BRANCH_SELECT)
      .single();
    if (error) throw error;

    const normalizedBranch = normalizeBranch(data);
    let branchResponse = mergeBranchStaffing([normalizedBranch], [])[0];
    if (payload.minWeekday || payload.hours || payload.hoursEnd) {
      const staffingRules = extractStaffingRules(data.id, payload);
      const { error: staffError } = await supabase.from(TABLES.branchStaffingRules).insert(staffingRules);
      if (staffError) throw staffError;
      branchResponse = mergeBranchStaffing([normalizedBranch], staffingRules)[0];
    }

    res.status(201).json({ message: 'เพิ่มสาขาสำเร็จ', data: branchResponse });
  } catch (error) {
    console.error('createBranch failed:', error);
    sendError(res, error, 'ไม่สามารถเพิ่มสาขาได้');
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });

    const payload = req.body;
    const branchData = {};
    if (payload.name !== undefined) branchData.name = payload.name;
    if (payload.code !== undefined) branchData.code = payload.code;
    if (payload.regionId !== undefined || payload.region_id !== undefined) {
      const regionId = parseInteger(payload.regionId ?? payload.region_id);
      if (regionId === null) return res.status(400).json({ message: 'region_id ต้องเป็นตัวเลข' });
      branchData.region_id = regionId;
    }

    const { data, error } = await supabase.from(TABLES.branches).update(branchData).eq('id', id).select(BRANCH_SELECT).single();
    if (error) throw error;

    const normalizedBranch = normalizeBranch(data);
    let branchResponse = mergeBranchStaffing([normalizedBranch], [])[0];
    if (payload.minWeekday !== undefined || payload.minWeekend !== undefined || payload.hours || payload.hoursEnd) {
      await supabase.from(TABLES.branchStaffingRules).delete().eq('branch_id', id);
      const staffingRules = extractStaffingRules(id, payload);
      const { error: staffError } = await supabase.from(TABLES.branchStaffingRules).insert(staffingRules);
      if (staffError) throw staffError;
      branchResponse = mergeBranchStaffing([normalizedBranch], staffingRules)[0];
    }

    res.json({ message: 'อัปเดตสาขาสำเร็จ', data: branchResponse });
  } catch (error) {
    console.error('updateBranch failed:', error);
    sendError(res, error, 'ไม่สามารถอัปเดตสาขาได้');
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    await supabase.from(TABLES.branchStaffingRules).delete().eq('branch_id', id);
    const { error } = await supabase.from(TABLES.branches).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบสาขาสำเร็จ' });
  } catch (error) {
    console.error('deleteBranch failed:', error);
    sendError(res, error, 'ไม่สามารถลบสาขาได้');
  }
};
