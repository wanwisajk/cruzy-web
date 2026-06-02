const express = require('express');
const controller = require('./employeesController');

const router = express.Router();

router.get('/', controller.listEmployees);
router.post('/', controller.createEmployee);
router.get('/:id', controller.getEmployee);
router.patch('/:id', controller.updateEmployee);
router.put('/:id/work-rules', controller.saveEmployeeWorkRules);
router.delete('/:id', controller.deleteEmployee);

module.exports = router;
