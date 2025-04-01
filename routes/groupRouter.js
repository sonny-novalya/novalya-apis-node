const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groups/groupController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Define the route handlers and their corresponding HTTP methods

const routes = [
  { method: "get", path: "/all", handler: groupController.getAllGroups },
  { method: "post", path: "/create", handler: groupController.createGroup },
  { method: "get", path: "/:groupID", handler: groupController.getGroupByID },
  { method: "put", path: "/:groupID", handler: groupController.updateGroup },
  {
    method: "put",
    path: "/members/:groupID",
    handler: groupController.updateGroupMembers,
  },
  {
    method: "get",
    path: "/delete/:groupID",
    handler: groupController.deleteGroup,
  },
  { method: "post", path: "/reorder", handler: groupController.reorderGroups },
  // { method: "post", path: "/limitDowngrade", handler: groupController.limitDowngrade},
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

module.exports = router;
