const express = require('express');
const Novadata = require('../controllers/novadata/Novadata');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/user-add', handler: Novadata.createUnfollow },
    { method: 'get', path: '/all', handler: Novadata.getAllUnfollow },
    { method: 'post', path: '/save-whitelist', handler: Novadata.saveWhitelist },
    { method: 'post', path: '/remove-whitelist', handler: Novadata.removeWhitelist },

    { method: 'get', path: '/whitelist-all', handler: Novadata.getAllWhitelist },
    { method: 'get', path: '/unfriend-all', handler: Novadata.getAllUnfriendlist },
    { method: 'post', path: '/get-unfriended', handler: Novadata.getUnfriendlist },
    { method: 'post', path: '/save-unfriended', handler: Novadata.saveUnfriendlist },
    { method: 'post', path: '/get-deactivated', handler: Novadata.getDeactivatedlist },
    { method: 'post', path: '/delete-deactivated', handler: Novadata.deleteDeactivated },

    { method: 'get', path: '/lost-all', handler: Novadata.getAllLostlist },
    { method: 'get', path: '/deactivated-all', handler: Novadata.getAllDeactivated },
    { method: 'post', path: '/user-add-new', handler: Novadata.createUnfollowNew },

    { method: 'post', path: '/get-nova-data', handler: Novadata.getFbNovaData }
    // { method: 'post', path: '/check', handler: Prospects.checkProspect }

];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
