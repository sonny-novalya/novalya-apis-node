const express = require('express');
const messageController = require('../controllers/messages/instagramMessageController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/all', handler: messageController.getAllMessages },
    { method: 'post', path: '/create', handler: messageController.createMessage },
    { method: 'get', path: '/:messageID', handler: messageController.getSingleMessage },
    { method: 'post', path: '/:messageID', handler: messageController.updateMessage },
    { method: 'get', path: '/delete/:messageID', handler: messageController.deleteMessage }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
