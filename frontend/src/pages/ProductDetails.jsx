
import { useParams, Link } from "react-router-dom";
import { useContext, useEffect, useState } from "react";

import { CartContext } from "../context/CartContext";
import { getProductById } from "../services/productService";

import "./ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();

  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch product details from the backend
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getProductById(id);

        const fetchedProduct = data.product || data;

        // Preserve all product attributes and map MongoDB _id to id
        setProduct({
          ...fetchedProduct,
          id: fetchedProduct.id || fetchedProduct._id,
        });
      } catch (err) {
        setError(err.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="product-not-found">
        <h2>Loading product details...</h2>
      </div>
    );
  }

  // Error or product not found
  if (error || !product) {
    return (
      <div className="product-not-found">
        <h2>
          {error ? "Unable to load product" : "Product not found!"}
        </h2>

        {error && <p>{error}</p>}

        <Link to="/products">Back to Products</Link>
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;

  return (
    <div className="product-details-page">
      <div className="product-details-image">
        <img src={product.image} alt={product.name} />
      </div>

      <div className="product-details-info">
        <p className="product-category">
          {product.category}
        </p>

        <h1>{product.name}</h1>

        <p className="details-rating">
          ⭐ {product.rating} / 5
        </p>

        <h2>₹{product.price}</h2>

        <p className="details-description">
          {product.description}
        </p>

        <p className={isOutOfStock ? "out-of-stock" : "in-stock"}>
          {isOutOfStock
            ? "Out of Stock"
            : `In Stock: ${product.stock} units`}
        </p>

        <button
          className="details-add-to-cart"
          onClick={() => addToCart(product)}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>

        <Link to="/products" className="back-to-products">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default ProductDetails;
