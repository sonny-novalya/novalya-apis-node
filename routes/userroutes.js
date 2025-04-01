const express = require("express");
const router = express.Router();

// Create a new routes : sachin
const UserController = require("../controllers/UserController");

router.post("/login", UserController.login);

module.exports = router;