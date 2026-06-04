const express = require('express');
const controller = require('./inspectionSettingsController');

const router = express.Router();

router.get('/', controller.listSettings);
router.post('/', controller.upsertSetting);

module.exports = router;
