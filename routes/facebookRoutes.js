const express = require("express");
const router = express.Router();
const facebookProfileController = require("../controllers/socialMediaFeatures/facebookProfileController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Define the route handlers and their corresponding HTTP methods

const routes = [
  {
    method: "post",
    path: "/create",
    handler: facebookProfileController.createOrUpdateFeature,
  },
  {
    method: "get",
    path: "/follow-followers",
    handler: facebookProfileController.getFollowersAndFollowings,
  },
  {
    method: "get",
    path: "/single",
    handler: facebookProfileController.getSingle,
  },
  {
    method: "delete",
    path: "/delete",
    handler: facebookProfileController.deleteFacebookProfileFeature,
  },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

module.exports = router;
