const express = require('express');
const router = express.Router();
const campaignController = require("../controllers/crm/instagram.campaign.controller");
const { authenticateUser } = require('../middlewares/authMiddleware');

// Define the route handlers and their corresponding HTTP methods

const routes = [
    { method: 'get', path: '/all', handler: campaignController.getAll },
    { method: 'get', path: '/user', handler: campaignController.userdata },
    { method: 'post', path: '/create', handler: campaignController.placecampaign },
    { method: 'get', path: '/:id', handler: campaignController.getOne },
    { method: 'put', path: '/:id', handler: campaignController.updateOne },
    { method: 'get', path: '/delete/:id', handler: campaignController.deleteOne },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;