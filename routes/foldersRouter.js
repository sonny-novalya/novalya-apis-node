const express = require("express");
const folderController = require("../controllers/folder/folderController");
const { authenticateUser } = require("../middlewares/authMiddleware");

const router = express.Router();

const routes = [
  { method: "get", path: "/all", handler: folderController.getAll },
  { method: "post", path: "/create", handler: folderController.create },
  { method: "get", path: "/create/default", handler: folderController.createDefault },
  {
    method: "get",
    path: "/:folderId",
    handler: folderController.getFolderByID,
  },
  {
    method: "patch",
    path: "/:folderId",
    handler: folderController.update,
  },
  {
    method: "delete",
    path: "/:folderId",
    handler: folderController.delete,
  }
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

module.exports = router;
