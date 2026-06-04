const express = require('express');
const controller = require('./inspectionLogsController');

const router = express.Router();

router.get('/', controller.listLogs);
router.post('/', controller.createLog);

module.exports = router;
