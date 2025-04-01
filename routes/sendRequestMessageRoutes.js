const express = require('express');
const sendRequestMessageController = require('../controllers/request_message/sendRequestMessageController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/all', handler: sendRequestMessageController.getAllSendRequestMessages },
    { method: 'post', path: '/create', handler: sendRequestMessageController.createSendRequestMessage },
    { method: 'post', path: '/:id', handler: sendRequestMessageController.updateSendRequestMessage },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
