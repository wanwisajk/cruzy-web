const express = require('express');
const controller = require('./storeInspectionsController');

const router = express.Router();

router.get('/', controller.listInspections);
router.post('/', controller.saveInspection);
router.get('/:id', controller.getInspection);
router.patch('/:id', controller.updateInspection);
router.delete('/:id', controller.deleteInspection);

module.exports = router;
