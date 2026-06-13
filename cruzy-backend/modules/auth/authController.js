const { supabase } = require('../../shared/db');
const { required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');
const { normalizeUser, verifyPassword } = require('../../shared/users');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!required(res, req.body, ['username', 'password'])) return;

    const { data, error } = await supabase
      .from(TABLES.users)
      .select('*')
      .eq('username', username)
      .limit(1);

    if (error) throw error;
    const user = data?.[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    res.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error('login failed:', error);
    sendError(res, error, 'ไม่สามารถเข้าสู่ระบบได้');
  }
};
