const express = require('express');
const Prospects = require('../controllers/prospects/Prospect');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/create', handler: Prospects.createProspect },
    { method: 'post', path: '/check', handler: Prospects.checkProspect },

    { method: 'get', path: '/get_all_prospect_members', handler: Prospects.getAllProspectMembers },
    { method: 'post', path: '/create_prospect_members', handler: Prospects.createFacebookProspectMember }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
