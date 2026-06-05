const express = require('express');
const controller = require('./attendanceController');

const router = express.Router();

router.get('/', controller.listAttendance);
router.post('/', controller.createAttendance);
router.get('/:id', controller.getAttendance);
router.patch('/:id', controller.updateAttendance);
router.delete('/:id', controller.deleteAttendance);

module.exports = router;
