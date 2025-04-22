const express = require('express');
const router = express.Router();
const stageController = require('../controllers/stage/stageController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// Define the route handlers and their corresponding HTTP methods

const routes = [
    { method: 'get', path: '/all', handler: stageController.getAllStages },
    { method: 'post', path: '/create', handler: stageController.createStage },
    { method: 'get', path: '/:id', handler: stageController.getStageById },
    { method: 'post', path: '/updated-stage/:id', handler: stageController.updateStage },
    { method: 'get', path: '/delete/:id', handler: stageController.deleteStage },
    { method: 'post', path: '/reOrderStageAndUpdateUser', handler: stageController.reOrderStageAndUpdateUser },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
