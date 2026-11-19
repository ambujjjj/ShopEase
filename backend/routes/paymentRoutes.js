
const express = require("express");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE RAZORPAY PAYMENT ORDER
router.post(
  "/create-order",
  protect,
  createRazorpayOrder
);

// VERIFY RAZORPAY PAYMENT
router.post(
  "/verify",
  protect,
  verifyRazorpayPayment
);

module.exports = router;
