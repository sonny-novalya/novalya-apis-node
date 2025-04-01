const express = require('express');
const birthdaySettingController = require('../controllers/birthday_setting/birthdaySettingController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/fetch', handler: birthdaySettingController.getBirthdaySetting },
    { method: 'post', path: '/create', handler: birthdaySettingController.createBirthdaySetting }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
