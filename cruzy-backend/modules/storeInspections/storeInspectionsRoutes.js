const express = require('express');
const controller = require('./storeInspectionsController');

const router = express.Router();

router.get('/dashboard', controller.getDashboardData);
router.get('/', controller.listInspections);
router.post('/', controller.saveInspection);
router.get('/:id(\\d+)', controller.getInspection);
router.patch('/:id(\\d+)', controller.updateInspection);
router.delete('/:id(\\d+)', controller.deleteInspection);

module.exports = router;
