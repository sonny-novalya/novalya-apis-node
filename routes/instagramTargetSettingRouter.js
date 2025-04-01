const express = require('express');
const TargetFriendSettingsController = require("../controllers/target_friend_settings/InstaTargetFriendSettingsController");
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/all', handler: TargetFriendSettingsController.getAllTargetSetting },
    { method: 'post', path: '/create', handler: TargetFriendSettingsController.createTargetSetting }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
