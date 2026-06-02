const express = require('express');
const controller = require('./authController');

const router = express.Router();

router.post('/login', controller.login);

module.exports = router;
