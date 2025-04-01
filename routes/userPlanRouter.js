const express = require("express");
const { authenticateUser } = require("../middlewares/authMiddleware");
const UserPlan = require("../controllers/UserPlan/UserPlan");
const router = express.Router();

const routes = [
  { method: "get", path: "/plan-details", handler: UserPlan.getPlanDetails },
  { method: "post", path: "/update-limit", handler: UserPlan.updateLimit },
  { method: "post", path: "/update-gender", handler: UserPlan.updateGender },
];

// Loop through the routes and define them using the router
routes.forEach(({ method, path, handler }) => {
  router[method](path, authenticateUser, handler);
});

router.get("/reset-limit", UserPlan.resetLimit);
module.exports = router;
