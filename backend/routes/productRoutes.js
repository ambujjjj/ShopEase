
const express = require("express");

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleWare");

const router = express.Router();

// PUBLIC ROUTES

// Get all products
router.get("/", getAllProducts);

// Get a single product
router.get("/:id", getProductById);

// ADMIN-ONLY ROUTES

// Create a product
router.post("/", protect, adminOnly, createProduct);

// Update a product
router.put("/:id", protect, adminOnly, updateProduct);

// Delete a product
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
