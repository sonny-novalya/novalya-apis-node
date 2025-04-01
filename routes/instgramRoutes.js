const express = require('express');
const router = express.Router();
const instagramProfileController = require('../controllers/socialMediaFeatures/instagramProfileController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// Define the route handlers and their corresponding HTTP methods

const routes = [
  {
    method: "post",
    path: "/create",
    handler: instagramProfileController.createOrUpdateFeature,
  },
  {
    method: "post",
    path: "/sync",
    handler: instagramProfileController.syncFeature,
  },
  {
    method: "get",
    path: "/follow-followers",
    handler: instagramProfileController.getFollowersAndFollowings,
  },
  {
    method: "get",
    path: "/single",
    handler: instagramProfileController.getSingle,
  },
  {
    method: "delete",
    path: "/delete",
    handler: instagramProfileController.deleteInstagramProfileFeature,
  },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

module.exports = router;