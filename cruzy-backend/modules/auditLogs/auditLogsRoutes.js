const express = require('express');
const { listAuditLogs, getAuditLog, createAuditLog } = require('./auditLogsController');

const router = express.Router();

router.get('/', listAuditLogs);
router.get('/:id', getAuditLog);
router.post('/', createAuditLog);

module.exports = router;
