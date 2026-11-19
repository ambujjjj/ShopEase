
const express = require("express");

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
} = require("../controllers/orderController");

const {
  getPendingOnlineOrder,
} = require("../controllers/pendingOrderController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// Customer routes
router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);

// Retrieve the latest pending online order
router.get("/pending-online", protect, getPendingOnlineOrder);

router.put("/:id/cancel", protect, cancelMyOrder);

// Admin routes
router.get("/", protect, adminOnly, getAllOrders);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
