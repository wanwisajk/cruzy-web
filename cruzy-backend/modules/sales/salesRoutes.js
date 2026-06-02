const express = require('express');
const controller = require('./salesController');

const router = express.Router();

router.get('/', controller.listSales);
router.post('/', controller.createSale);
router.get('/:id', controller.getSale);
router.patch('/:id', controller.updateSale);
router.delete('/:id', controller.deleteSale);

module.exports = router;
