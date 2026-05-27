const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const scheduleRoutes = require('./cruzy-admin-backend/routes/scheduleRoutes');
const adminConsoleRoutes = require('./cruzy-admin-backend/routes/adminConsoleRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, 'cruzy-admin-frontend');

app.use(express.static(frontendPath));
app.get('/app-config.js', (req, res) => {
  res.type('application/javascript');
  const apiUrl = process.env.API_URL || '/api';
  res.send(`window.__APP_CONFIG = { API_URL: '${apiUrl}' };`);
});

// Middleware
app.use(cors()); // อนุญาตให้หน้าเว็บ HTML เข้าถึง API นี้ได้โดยไม่ติดบล็อก CORS
app.use(express.json()); // อนุญาตให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ใน req.body ได้

// ผูกเส้นทาง API (จะขึ้นต้นด้วย /api เสมอ)
app.use('/api', scheduleRoutes);
app.use('/api', adminConsoleRoutes);

app.get('/health', (req, res) => {
  res.send('🚀 Cruzy Admin Backend API is running perfectly!');
});

// เริ่มต้นเปิดการทำงานระบบตาม Port ที่ตั้งไว้
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server ของคุณพร้อมใช้งานแล้ว!`);
  console.log(`📡 กำลังรันอยู่ที่ลิงก์: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
