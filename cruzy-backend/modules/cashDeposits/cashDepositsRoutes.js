const express = require('express');
const controller = require('./cashDepositsController');

const router = express.Router();

router.get('/', controller.listCashDeposits);
router.post('/', controller.createCashDeposit);
router.get('/:id', controller.getCashDeposit);
router.patch('/:id', controller.updateCashDeposit);
router.patch('/:id/status', controller.updateCashDepositStatus);
router.post('/:id/approve', controller.approveCashDeposit);
router.post('/:id/reject', controller.rejectCashDeposit);
router.delete('/:id', controller.deleteCashDeposit);

module.exports = router;
