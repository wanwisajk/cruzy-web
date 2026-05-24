const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_KEY ในไฟล์ .env ให้ถูกต้อง");
  process.exit(1);
}

// สร้าง Instance สำหรับติดต่อฐานข้อมูล
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;