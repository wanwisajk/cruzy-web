const supabase = require('../config/supabase');
const crypto = require('crypto');

async function fetchTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

function normalizeEmployee(employee) {
  return {
    ...employee,
    c: employee.color,
    pos: employee.position
  };
}

function normalizeUser(user) {
  const scope = user.scope_type === 'all' ? 'all' : user.scope_value;
  const labelMap = {
    owner: 'Owner',
    regional: 'Regional',
    branch: 'Branch'
  };

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    label: labelMap[user.role] || user.role,
    scopeType: user.scope_type,
    scope
  };
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (inputPassword === storedPassword) return true;

  const sha256 = crypto.createHash('sha256').update(inputPassword).digest('hex');
  return sha256 === storedPassword;
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอก username และ password' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, password_hash, name, role, scope_type, scope_value')
      .eq('username', username)
      .limit(1);

    if (error) throw error;
    const user = data?.[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    res.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'ไม่สามารถเข้าสู่ระบบได้', error: error.message });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await fetchTable('employees');
    res.json(employees.map(normalizeEmployee));
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

    res.json(normalizeEmployee(data[0]));
  } catch (error) {
    console.error('Error fetching employee by id:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลพนักงานได้', error: error.message });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    const branches = await fetchTable('branches');
    res.json(branches);
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

exports.getConsoleData = async (req, res) => {
  try {
    const [regions, branches, employees, schedules, leaves, leaveBalances, contracts, sales, cashDeposits, users] = await Promise.all([
      fetchTable('regions'),
      fetchTable('branches'),
      fetchTable('employees'),
      fetchTable('schedules'),
      fetchTable('leaves'),
      fetchTable('leave_balances'),
      fetchTable('contracts'),
      fetchTable('sales'),
      fetchTable('cash_deposits'),
      fetchTable('users', 'id, username, name, role, scope_type, scope_value, created_at')
    ]);

    res.json({
      regions,
      branches,
      employees,
      schedules,
      leaves,
      leaveBalances,
      contracts,
      sales,
      cashDeposits,
      users: users.map(normalizeUser)
    });
  } catch (error) {
    console.error('Error fetching admin console data:', error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Admin Console ได้', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }

    const { data, error } = await supabase
      .from('leaves')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'อัปเดตสถานะการลาเรียบร้อยแล้ว', data });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ message: 'ไม่สามารถอัปเดตสถานะการลาได้', error: error.message });
  }
};
