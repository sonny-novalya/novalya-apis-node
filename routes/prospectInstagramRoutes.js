const express = require('express');
const Prospects = require("../controllers/prospects/ProspectInstagram");
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/create', handler: Prospects.createProspect },
    { method: 'post', path: '/check', handler: Prospects.checkProspect },
    
    { method: 'get', path: '/get_all_prospect_members', handler: Prospects.getAllProspectMembers },
    { method: 'get', path: '/get_private_users', handler: Prospects.getAllPrivateMembers },
    { method: 'post', path: '/create_prospect_members', handler: Prospects.createInstagramProspectMember },
    { method: 'post', path: '/save_private_insta_user', handler: Prospects.createInstaPrivateMember }

];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
