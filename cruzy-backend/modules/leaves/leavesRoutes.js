const express = require('express');
const controller = require('./leavesController');

const router = express.Router();

router.get('/', controller.listLeaves);
router.post('/', controller.createLeave);
router.get('/:id', controller.getLeave);
router.patch('/:id', controller.updateLeave);
router.patch('/:id/status', controller.updateLeaveStatus);
router.delete('/:id', controller.deleteLeave);

module.exports = router;
