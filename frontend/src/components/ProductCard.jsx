
import { Link } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import "./ProductCard.css";

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);

  const isOutOfStock = product.stock === 0;

  return (
    <div className="product-card">
      <Link
        to={`/products/${product.id}`}
        className="product-card-link"
      >
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
        />

        <div className="product-info">
          <h3>{product.name}</h3>

          <p className="product-description">
            {product.description}
          </p>

          <p className="product-price">
            ₹{product.price}
          </p>

          <p className="product-rating">
            ⭐ {product.rating} / 5
          </p>

          <p
            className={
              product.stock === 0
                ? "out-of-stock"
                : product.stock <= 5
                  ? "low-stock"
                  : "in-stock"
            }
          >
            {product.stock === 0
              ? "Out of Stock"
              : product.stock <= 5
                ? `Only ${product.stock} left!`
                : "In Stock"}
          </p>
        </div>
      </Link>

      <button
        className="add-to-cart"
        onClick={() => addToCart(product)}
        disabled={isOutOfStock}
      >
        {isOutOfStock ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  );
}

export default ProductCard;
