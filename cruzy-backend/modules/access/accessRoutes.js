const express = require('express');
const controller = require('./accessController');

const router = express.Router();

router.get('/', controller.getAccessData);
router.get('/users', controller.listUsers);

module.exports = router;
