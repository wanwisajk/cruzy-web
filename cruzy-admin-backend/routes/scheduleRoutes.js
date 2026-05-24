const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// เส้นทางสำหรับ ตารางงาน (Schedules)
router.get('/schedule', scheduleController.getAllSchedules);
router.post('/schedule/assign', scheduleController.assignSchedule);
router.post('/schedule/remove', scheduleController.removeSchedule);

module.exports = router;