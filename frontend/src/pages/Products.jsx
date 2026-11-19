
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { getAllProducts } from "../services/productService";

import "./Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("default");

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";

  // Fetch products from the backend
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAllProducts();

        const fetchedProducts = Array.isArray(data)
          ? data
          : data.products || [];

        // Preserve all product fields and provide an id for ProductCard
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

  // Filter products by search and category
  let filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort products
  if (sortOption === "price-low-high") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === "price-high-low") {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortOption === "rating") {
    filteredProducts.sort((a, b) => b.rating - a.rating);
  }

  if (loading) {
    return (
      <div className="all-products-page">
        <h2>Loading products...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-products-page">
        <h2>Unable to load products</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="all-products-page">
      <h1>All Products</h1>
      <p>Explore our collection of amazing products.</p>

      {/* Category Filters */}
      <div className="category-filters">
        {["All", "Electronics", "Fashion"].map((category) => (
          <button
            key={category}
            className={
              selectedCategory === category ? "active" : ""
            }
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Sorting */}
      <div className="sorting-section">
        <label htmlFor="sort-products">Sort By:</label>

        <select
          id="sort-products"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="price-low-high">Price: Low to High</option>
          <option value="price-high-low">Price: High to Low</option>
          <option value="rating">Highest Rating</option>
        </select>
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="no-products">
          <h2>No products found</h2>
          <p>Try changing your search or category filter.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Products;
