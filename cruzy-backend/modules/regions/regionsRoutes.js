const express = require('express');
const controller = require('./regionsController');

const router = express.Router();

router.get('/', controller.listRegions);
router.post('/', controller.createRegion);
router.get('/:id', controller.getRegion);
router.patch('/:id', controller.updateRegion);
router.delete('/:id', controller.deleteRegion);

module.exports = router;
