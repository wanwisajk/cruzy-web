const supabase = require('../config/supabase');

// 1. ดึงข้อมูลตารางงานทั้งหมด และแปลงโครงสร้างให้อยู่ในรูปที่ Frontend (HTML) ต้องการ
exports.getAllSchedules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*');
      

    if (error) throw error;

    // เปลี่ยนจากรูปแบบ Row ใน DB ไปเป็น Object Format => { "b1_2026-04-01": ["e1", "e3"] }
    const dbFormat = {};
    data.forEach(row => {
      const key = `${row.branch_id}_${row.work_date}`;
      if (!dbFormat[key]) dbFormat[key] = [];
      dbFormat[key].push(row.employee_id);
    });

    res.json(dbFormat);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลตารางงานได้', error: error.message });
  }
};

// 2. จัดตารางงานใหม่ (Assign)
exports.assignSchedule = async (req, res) => {
  const { bid, date, eid } = req.body;

  if (!bid || !date || !eid) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน (ต้องการ bid, date, eid)' });
  }

  try {
    // บันทึกลงตาราง schedules ใน Supabase
    const { data, error } = await supabase
      .from('schedules')
      .insert([
        { branch_id: bid, work_date: date, employee_id: eid }
      ])
      .select();

    if (error) {
      // ตรวจสอบในกรณีเกิดข้อผิดพลาดจาก UNIQUE Constraint (โค้ด 23505 คือมีการลงตารางซ้ำวันเดียวกัน)
      if (error.code === '23505') {
        return res.status(400).json({ message: 'พนักงานคนนี้มีตารางงานในวันนี้ที่สาขาอื่นแล้ว' });
      }
      throw error;
    }

    res.status(201).json({ message: 'บันทึกตารางงานสำเร็จ', data });
  } catch (error) {
    console.error('Error assigning schedule:', error);
    res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาดในการบันทึก', error: error.message });
  }
};

// 3. ลบตารางงาน (Remove)
exports.removeSchedule = async (req, res) => {
  const { bid, date, eid } = req.body;

  if (!bid || !date || !eid) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน (ต้องการ bid, date, eid)' });
  }

  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .match({ branch_id: bid, work_date: date, employee_id: eid });

    if (error) throw error;

    res.json({ message: 'ลบตารางงานเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error removing schedule:', error);
    res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาดในการลบข้อมูล', error: error.message });
  }
};