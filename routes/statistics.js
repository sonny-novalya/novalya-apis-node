const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statistic/statisticController");
const { authenticateUser } = require("../middlewares/authMiddleware");

const routes = [
  {
    method: "get",
    path: "/statistics",
    handler: statisticController.getStatistics,
  },
  {
    method: "post",
    path: "/statistics",
    handler: statisticController.createStatistic,
  },
  {
    method: "get",
    path: "/contacts",
    handler: statisticController.getContacts,
  },
  {
    method: "get",
    path: "/limits",
    handler: statisticController.getLimits,
  },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

module.exports = router;
