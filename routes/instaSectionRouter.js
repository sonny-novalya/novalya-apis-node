const express = require('express');
const sectionController = require('../controllers/section/instaSectionController');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'get', path: '/all', handler: sectionController.getAllSections },
    { method: 'post', path: '/create', handler: sectionController.createSection },
    { method: 'get', path: '/:sectionID', handler: sectionController.getSectionByID },
    { method: 'post', path: '/:sectionID', handler: sectionController.updateSection },
    { method: 'get', path: '/duplicate/:sectionID', handler: sectionController.duplicateSection },
    { method: 'get', path: '/delete/:sectionID', handler: sectionController.deleteSection },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
