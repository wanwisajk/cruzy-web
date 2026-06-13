const express = require('express');
const controller = require('./salarySummariesController');

const router = express.Router();

router.get('/', controller.listSalarySummaries);
router.post('/', controller.createSalarySummary);
router.post('/generate', controller.generateSalarySummaries);
router.get('/:id', controller.getSalarySummary);
router.patch('/:id', controller.updateSalarySummary);

module.exports = router;
