const supabase = require('../config/supabase');

exports.getAllSchedules = async (req, res) => {
  try {
    const { data, error } = await supabase.from('schedules').select('*');
    if (error) throw error;

    const schedulesByBranchDate = {};
    (data || []).forEach((row) => {
      const key = `${row.branch_id}_${row.work_date}`;
      if (!schedulesByBranchDate[key]) schedulesByBranchDate[key] = [];
      schedulesByBranchDate[key].push(row.employee_id);
    });

    res.json(schedulesByBranchDate);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลตารางงานได้', error: error.message });
  }
};

exports.assignSchedule = async (req, res) => {
  const { bid, date, eid } = req.body;

  if (!bid || !date || !eid) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน (ต้องการ bid, date, eid)' });
  }

  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert([{ branch_id: bid, work_date: date, employee_id: eid }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'พนักงานคนนี้มีตารางงานในวันนี้ที่สาขาอื่นแล้ว' });
      }
      throw error;
    }

    res.status(201).json({ message: 'บันทึกตารางงานสำเร็จ', data });
  } catch (error) {
    res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาดในการบันทึก', error: error.message });
  }
};

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
    res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาดในการลบข้อมูล', error: error.message });
  }
};
