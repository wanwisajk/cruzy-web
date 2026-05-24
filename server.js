const express = require('express');
const cors = require('cors');
require('dotenv').config();

const scheduleRoutes = require('./cruzy-admin-backend/routes/scheduleRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // อนุญาตให้หน้าเว็บ HTML เข้าถึง API นี้ได้โดยไม่ติดบล็อก CORS
app.use(express.json()); // อนุญาตให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ใน req.body ได้

// ผูกเส้นทาง API (จะขึ้นต้นด้วย /api เสมอ)
app.use('/api', scheduleRoutes);

// ตรวจสอบหน้าแรก (Health Check)
app.get('/', (req, res) => {
  res.send('🚀 Cruzy Admin Backend API is running perfectly!');
});

// เริ่มต้นเปิดการทำงานระบบตาม Port ที่ตั้งไว้
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server ของคุณพร้อมใช้งานแล้ว!`);
  console.log(`📡 กำลังรันอยู่ที่ลิงก์: http://localhost:${PORT}`);
  console.log(`==================================================`);
});