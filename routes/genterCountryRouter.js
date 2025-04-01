const express = require('express');
const router = express.Router();
const genderCountryController = require('../controllers/genderCountry/genderCountryController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// Define the route handlers and their corresponding HTTP methods

const routes = [
    { method: 'get', path: '/', handler: genderCountryController.getGenderCountry },
    { method: 'get', path: '/multiple/', handler: genderCountryController.getGenderCountryForMultipleName },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
