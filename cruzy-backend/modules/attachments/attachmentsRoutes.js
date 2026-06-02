const express = require('express');
const controller = require('./attachmentsController');

const router = express.Router();

router.get('/', controller.listAttachments);
router.post('/', controller.createAttachment);
router.post('/bulk', controller.createAttachments);
router.delete('/:id', controller.deleteAttachment);

module.exports = router;
