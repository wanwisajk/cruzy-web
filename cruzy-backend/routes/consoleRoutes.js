const express = require('express');

const authRoutes = require('../modules/auth/authRoutes');
const consoleRoutes = require('../modules/console/consoleRoutes');
const employeesRoutes = require('../modules/employees/employeesRoutes');
const branchesRoutes = require('../modules/branches/branchesRoutes');
const regionsRoutes = require('../modules/regions/regionsRoutes');
const bankAccountsRoutes = require('../modules/bankAccounts/bankAccountsRoutes');
const schedulesRoutes = require('../modules/schedules/schedulesRoutes');
const leavesRoutes = require('../modules/leaves/leavesRoutes');
const salesRoutes = require('../modules/sales/salesRoutes');
const storeInspectionsRoutes = require('../modules/storeInspections/storeInspectionsRoutes');
const attendanceAlertsRoutes = require('../modules/attendanceAlerts/attendanceAlertsRoutes');
const warningLettersRoutes = require('../modules/warningLetters/warningLettersRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/console', consoleRoutes);
router.use('/admin-console', consoleRoutes);
router.use('/employees', employeesRoutes);
router.use('/branches', branchesRoutes);
router.use('/regions', regionsRoutes);
router.use('/bank-accounts', bankAccountsRoutes);
router.use('/schedule', schedulesRoutes);
router.use('/leaves', leavesRoutes);
router.use('/sales', salesRoutes);
router.use('/store-inspections', storeInspectionsRoutes);
router.use('/attendance-alerts', attendanceAlertsRoutes);
router.use('/warning-letters', warningLettersRoutes);

module.exports = router;
