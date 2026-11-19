
import { useEffect, useState } from "react";

import ProductCard from "../components/ProductCard";
import { getAllProducts } from "../services/productService";

import "./Home.css";

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch featured products from MongoDB
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAllProducts();

        const fetchedProducts = Array.isArray(data)
          ? data
          : data.products || [];

        const formattedProducts = fetchedProducts.map((product) => ({
          ...product,
          id: product.id || product._id,
        }));

        setProducts(formattedProducts);
      } catch (err) {
        setError(err.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div>
      <section className="hero">
        <h1>Welcome to ShopEase</h1>
        <p>Your one-stop destination for online shopping.</p>
      </section>

      <section className="products-section">
        <h2>Featured Products</h2>

        {loading ? (
          <p>Loading featured products...</p>
        ) : error ? (
          <p>{error}</p>
        ) : products.length === 0 ? (
          <p>No products available currently.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
