const supabase = require('../config/supabase');

exports.getAllBranches = async (req, res) => {
  try {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) throw error;

    // คืนค่าข้อมูลจาก DB โดยตรง (frontend จะจัดการฟอร์แมตเอง)
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสาขาได้', error: error.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('branches').select('*').eq('id', id).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสาขา' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching branch by id:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสาขาได้', error: error.message });
  }
};
