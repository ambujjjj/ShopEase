
const Product = require("../models/Product");

// GET ALL PRODUCTS
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    res.status(200).json({
      message: "Products fetched successfully",
      count: products.length,
      products,
    });

  } catch (error) {
    console.error("Get Products Error:", error.message);

    res.status(500).json({
      message: "Server error while fetching products",
    });
  }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });

  } catch (error) {
    console.error("Get Product Error:", error.message);

    res.status(500).json({
      message: "Server error while fetching product",
    });
  }
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      rating,
      image,
      category,
      stock,
    } = req.body;

    if (
      !name ||
      !description ||
      price === undefined ||
      !image ||
      !category ||
      stock === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required product fields",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      rating,
      image,
      category,
      stock,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error) {
    console.error("Create Product Error:", error.message);

    res.status(500).json({
      message: "Server error while creating product",
    });
  }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "description",
      "price",
      "rating",
      "image",
      "category",
      "stock",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });

  } catch (error) {
    console.error("Update Product Error:", error.message);

    res.status(500).json({
      message: "Server error while updating product",
    });
  }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });

  } catch (error) {
    console.error("Delete Product Error:", error.message);

    res.status(500).json({
      message: "Server error while deleting product",
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
