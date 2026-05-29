const express = require('express');
const adminConsoleController = require('../controllers/adminConsoleController');

const router = express.Router();

router.post('/auth/login', adminConsoleController.login);
router.get('/admin-console/data', adminConsoleController.getConsoleData);
router.get('/employees', adminConsoleController.getAllEmployees);
router.get('/branches', adminConsoleController.getAllBranches);
router.patch('/leaves/:id/status', adminConsoleController.updateLeaveStatus);
router.post('/warning-letters', adminConsoleController.createWarningLetter);

module.exports = router;
