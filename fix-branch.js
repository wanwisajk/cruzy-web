const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'cruzy-backend/controllers/consoleController.js');
let content = fs.readFileSync(file, 'utf-8');

// Check if already fixed
if (content.includes('extractStaffingRules(id, payload)')) {
  console.log('✓ Already fixed - updateBranch uses extractStaffingRules');
  process.exit(0);
}

// Replace updateBranch update logic
const oldUpdate = `    const { data, error } = await supabase
      .from(TABLES.branches)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'อัปเดตสาขาสำเร็จ', data });`;

const newUpdate = `    const branchData = {
      name: payload.name,
      code: payload.code,
      region_id: payload.region_id
    };
    const { data, error } = await supabase
      .from(TABLES.branches)
      .update(branchData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (payload.minWeekday !== undefined || payload.minWeekend !== undefined || payload.hours || payload.hoursEnd) {
      await supabase.from(TABLES.branchStaffingRules).delete().eq('branch_id', id);
      const staffingRules = extractStaffingRules(id, payload);
      const { error: staffError } = await supabase.from(TABLES.branchStaffingRules).insert(staffingRules);
      if (staffError) throw staffError;
    }
    res.json({ message: 'อัปเดตสาขาสำเร็จ', data });`;

content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync(file, content);
console.log('✓ Fixed updateBranch function');
