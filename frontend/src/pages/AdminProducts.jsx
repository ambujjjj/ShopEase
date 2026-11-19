
import { useEffect, useState, useContext } from "react";

import { AuthContext } from "../context/AuthContext";

import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";

import "./AdminProducts.css";

const initialFormData = {
  name: "",
  description: "",
  price: "",
  image: "",
  category: "",
  stock: "",
  rating: "0",
};

function AdminProducts() {
  const { token } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllProducts();

      setProducts(
        Array.isArray(data) ? data : data.products || []
      );
    } catch (err) {
      setError(err.message || "Failed to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const productData = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        rating: Number(formData.rating),
      };

      if (editingId) {
        await updateProduct(editingId, productData, token);
        setSuccess("Product updated successfully!");
      } else {
        await createProduct(productData, token);
        setSuccess("Product added successfully!");
      }

      resetForm();
      await fetchProducts();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id || product.id);

    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      image: product.image || "",
      category: product.category || "",
      stock: String(product.stock ?? ""),
      rating: String(product.rating ?? 0),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (productId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      await deleteProduct(productId, token);

      setProducts((previousProducts) =>
        previousProducts.filter(
          (product) => (product._id || product.id) !== productId
        )
      );

      if (editingId === productId) {
        resetForm();
      }

      setSuccess("Product deleted successfully!");
    } catch (err) {
      setError(err.message || "Failed to delete product.");
    }
  };

  return (
    <div className="admin-products">
      <div className="admin-products-header">
        <div>
          <h1>Product Management</h1>
          <p>Manage all products available in your store.</p>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT FORM */}
      <section className="add-product-section">
        <h2>
          {editingId ? "Edit Product" : "Add New Product"}
        </h2>

        <form
          className="add-product-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter product description"
              required
            />
          </div>

          <div className="form-group">
            <label>Price (₹)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="Enter product image URL"
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. Electronics, Fashion"
              required
            />
          </div>

          <div className="form-group">
            <label>Available Stock</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              placeholder="Enter available quantity"
              min="0"
              step="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Rating (0–5)</label>
            <input
              type="number"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              min="0"
              max="5"
              step="0.1"
            />
          </div>

          <button
            type="submit"
            className="add-product-btn"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : editingId
                ? "Update Product"
                : "Add Product"}
          </button>

          {editingId && (
            <button
              type="button"
              className="cancel-edit-btn"
              onClick={resetForm}
            >
              Cancel Editing
            </button>
          )}
        </form>
      </section>

      {success && (
        <p className="admin-success">{success}</p>
      )}

      {error && (
        <p className="admin-error">{error}</p>
      )}

      {/* EXISTING PRODUCTS */}
      <section className="product-list-section">
        <h2>Existing Products</h2>

        {loading ? (
          <p className="admin-loading">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="admin-empty">
            No products found in your store.
          </p>
        ) : (
          <div className="admin-products-table-wrapper">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const productId = product._id || product.id;

                  return (
                    <tr key={productId}>
                      <td>
                        <div className="admin-product-info">
                          <img
                            src={product.image}
                            alt={product.name}
                          />
                          <span>{product.name}</span>
                        </div>
                      </td>

                      <td>₹{product.price}</td>
                      <td>{product.category}</td>
                      <td>{product.stock}</td>

                      <td>
                        <div className="product-action-buttons">
                          <button
                            className="edit-product-btn"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-product-btn"
                            onClick={() => handleDelete(productId)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminProducts;
