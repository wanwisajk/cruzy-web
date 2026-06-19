const express = require('express');
const controller = require('./accessController');

const router = express.Router();

router.use(controller.requireOwner);

router.get('/', controller.getAccessData);
router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.patch('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

module.exports = router;
