const express = require('express');
const Commentai = require('../controllers/commentai/Commentai');
const { authenticateUser } = require('../middlewares/authMiddleware');

const router = express.Router();

const routes = [
    { method: 'post', path: '/commentgenerate', handler: Commentai.commentGenerate },

];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
    router[method](path, authenticateUser, handler);
});

module.exports = router;
