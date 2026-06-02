const express = require('express');
const controller = require('./attendanceAlertsController');

const router = express.Router();

router.get('/', controller.listAlerts);
router.post('/', controller.createAlert);
router.get('/:id', controller.getAlert);
router.patch('/:id', controller.updateAlert);
router.patch('/:id/ack', controller.acknowledgeAlert);
router.delete('/:id', controller.deleteAlert);

module.exports = router;
