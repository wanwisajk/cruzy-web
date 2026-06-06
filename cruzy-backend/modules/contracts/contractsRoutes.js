const express = require('express');
const controller = require('./contractsController');

const router = express.Router();

router.get('/', controller.listContracts);
router.post('/', controller.createContract);
router.get('/:id', controller.getContract);
router.patch('/:id', controller.updateContract);
router.delete('/:id', controller.deleteContract);

module.exports = router;
