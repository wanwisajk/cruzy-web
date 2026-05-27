const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');

router.get('/branches', branchController.getAllBranches);
router.get('/branches/:id', branchController.getBranchById);

module.exports = router;
