const express = require('express');
const controller = require('./warningLettersController');

const router = express.Router();

router.get('/', controller.listWarningLetters);
router.post('/', controller.createWarningLetter);
router.get('/:id', controller.getWarningLetter);
router.patch('/:id', controller.updateWarningLetter);
router.delete('/:id', controller.deleteWarningLetter);

module.exports = router;
