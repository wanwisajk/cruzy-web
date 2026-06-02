const express = require('express');
const controller = require('./branchesController');

const router = express.Router();

router.get('/', controller.listBranches);
router.post('/', controller.createBranch);
router.get('/:id', controller.getBranch);
router.patch('/:id', controller.updateBranch);
router.delete('/:id', controller.deleteBranch);

module.exports = router;
