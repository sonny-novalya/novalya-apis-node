const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywords/instaKeywordController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// Define the route handlers and their corresponding HTTP methods

const routes = [
    { method: 'get', path: '/all', handler: keywordController.getAll },
    { method: 'post', path: '/create', handler: keywordController.create },
    { method: 'get', path: '/:keywordID', handler: keywordController.getByID },
    { method: 'post', path: '/:keywordID', handler: keywordController.update },
    { method: 'get', path: '/delete/:keywordID', handler: keywordController.delete },
    { method: 'get', path: '/duplicate/:keywordID', handler: keywordController.duplicate },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
