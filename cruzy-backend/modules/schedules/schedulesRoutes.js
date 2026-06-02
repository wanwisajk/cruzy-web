const express = require('express');
const controller = require('./schedulesController');

const router = express.Router();

router.get('/', controller.getScheduleMap);
router.get('/rows', controller.listSchedules);
router.post('/', controller.createSchedule);
router.post('/assign', controller.assignSchedule);
router.post('/remove', controller.removeSchedule);
router.get('/:id', controller.getSchedule);
router.patch('/:id', controller.updateSchedule);
router.delete('/:id', controller.deleteSchedule);

module.exports = router;
