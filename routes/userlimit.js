const express = require('express');
const Userlimit = require('../controllers/Userlimit/Userlimit');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/check', handler: Userlimit.checkPlan },
    { method: 'post', path: '/update-message', handler: Userlimit.updateMessage },
    { method: 'post', path: '/update-connect', handler: Userlimit.updateConnect },

];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
