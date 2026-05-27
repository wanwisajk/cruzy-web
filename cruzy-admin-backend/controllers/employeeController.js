const supabase = require('../config/supabase');

exports.getAllEmployees = async (req, res) => {
  try {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลพนักงานได้', error: error.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'ไม่พบพนักงาน' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching employee by id:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลพนักงานได้', error: error.message });
  }
};
