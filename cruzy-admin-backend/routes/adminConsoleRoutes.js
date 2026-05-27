const express = require('express');
const router = express.Router();
const adminConsoleController = require('../controllers/adminConsoleController');

router.post('/auth/login', adminConsoleController.login);
router.get('/employees', adminConsoleController.getAllEmployees);
router.get('/employees/:id', adminConsoleController.getEmployeeById);
router.get('/branches', adminConsoleController.getAllBranches);
router.get('/branches/:id', adminConsoleController.getBranchById);
router.get('/admin-console/data', adminConsoleController.getConsoleData);
router.patch('/leaves/:id/status', adminConsoleController.updateLeaveStatus);

module.exports = router;
