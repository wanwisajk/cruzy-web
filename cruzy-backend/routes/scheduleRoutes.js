const express = require('express');
const scheduleController = require('../controllers/scheduleController');

const router = express.Router();

router.get('/schedule', scheduleController.getAllSchedules);
router.post('/schedule/assign', scheduleController.assignSchedule);
router.post('/schedule/remove', scheduleController.removeSchedule);

module.exports = router;
