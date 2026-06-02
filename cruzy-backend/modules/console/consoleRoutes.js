const express = require('express');
const controller = require('./consoleController');

const router = express.Router();

router.get('/data', controller.getConsoleData);

module.exports = router;
