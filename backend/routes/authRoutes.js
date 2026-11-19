
const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Registration API
router.post("/register", registerUser);

// Login API
router.post("/login", loginUser);

// Get logged-in user (Protected API)
router.get("/me", protect, getMe);

module.exports = router;
