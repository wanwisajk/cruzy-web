const express = require('express');
const controller = require('./bankAccountsController');

const router = express.Router();

router.get('/', controller.listBankAccounts);
router.post('/', controller.createBankAccount);
router.get('/:id', controller.getBankAccount);
router.patch('/:id', controller.updateBankAccount);
router.delete('/:id', controller.deleteBankAccount);

module.exports = router;
