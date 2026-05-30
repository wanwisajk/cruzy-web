const express = require('express');
const controller = require('../controllers/consoleController');

const router = express.Router();

router.post('/auth/login', controller.login);
router.get('/console/data', controller.getConsoleData);
router.get('/admin-console/data', controller.getConsoleData);

router.get('/employees', controller.listEmployees);
router.post('/employees', controller.createEmployee);
router.patch('/employees/:id', controller.updateEmployee);
router.put('/employees/:id/work-rules', controller.saveEmployeeWorkRules);
router.delete('/employees/:id', controller.deleteEmployee);

router.get('/branches', controller.listBranches);
router.post('/bank-accounts', controller.createBankAccount);
router.patch('/bank-accounts/:id', controller.updateBankAccount);
router.get('/schedule', controller.getScheduleMap);
router.post('/schedule/assign', controller.assignSchedule);
router.post('/schedule/remove', controller.removeSchedule);

router.patch('/leaves/:id/status', controller.updateLeaveStatus);
router.patch('/sales/:id', controller.updateSale);
router.post('/sales', controller.createSale);
router.post('/store-inspections', controller.saveInspection);
router.patch('/attendance-alerts/:id/ack', controller.acknowledgeAlert);
router.post('/warning-letters', controller.createWarningLetter);

module.exports = router;
