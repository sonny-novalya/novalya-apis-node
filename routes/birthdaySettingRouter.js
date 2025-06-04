const express = require('express');
const birthdaySettingController = require('../controllers/birthday_setting/birthdaySettingController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/fetch-new', handler: birthdaySettingController.getBirthdaySettingExcludingVariant },
    { method: 'post', path: '/fetch', handler: birthdaySettingController.getBirthdaySetting },
    { method: 'post', path: '/create', handler: birthdaySettingController.createBirthdaySetting },
    
    { method: 'post', path: '/settings/list', handler: birthdaySettingController.getBirthdaySettingListing },
    { method: 'post', path: '/settings/create', handler: birthdaySettingController.createBirthdaySettingListing },
    { method: 'post', path: '/settings/update', handler: birthdaySettingController.updateBirthdaySettingListing }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
