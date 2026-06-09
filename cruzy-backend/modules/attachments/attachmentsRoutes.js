const express = require('express');
const controller = require('./attachmentsController');

const router = express.Router();

router.get('/', controller.listAttachments);
router.post('/upload', controller.uploadAttachment);
router.post('/bulk', controller.createAttachments);
router.post('/', controller.createAttachment);
router.delete('/:id', controller.deleteAttachment);

module.exports = router;
