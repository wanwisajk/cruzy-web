const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'cruzy-backend/controllers/consoleController.js');
let content = fs.readFileSync(file, 'utf-8');

// Fix createBranch
if (!content.includes('// Extract only valid branch fields')) {
  const oldCreate = `    const { data, error } = await supabase
      .from(TABLES.branches)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มสาขาสำเร็จ', data });`;

  const newCreate = `    const branchData = {
      id: payload.id,
      name: payload.name,
      code: payload.code,
      region_id: payload.region_id
    };
    const { data, error } = await supabase
      .from(TABLES.branches)
      .insert([branchData])
      .select()
      .single();
    if (error) throw error;
    if (payload.minWeekday || payload.hours || payload.hoursEnd) {
      const staffingRules = extractStaffingRules(payload.id, payload);
      const { error: staffError } = await supabase.from(TABLES.branchStaffingRules).insert(staffingRules);
      if (staffError) throw staffError;
    }
    res.status(201).json({ message: 'เพิ่มสาขาสำเร็จ', data });`;

  content = content.replace(oldCreate, newCreate);
  fs.writeFileSync(file, content);
  console.log('✓ Fixed createBranch function');
} else {
  console.log('✓ createBranch already fixed');
}
