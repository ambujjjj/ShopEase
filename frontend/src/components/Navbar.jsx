
import { Link, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";

import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";

import "./Navbar.css";

function Navbar() {
  const { totalItems } = useContext(CartContext);

  const {
    user,
    isAuthenticated,
    logout,
  } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();

    if (searchTerm.trim()) {
      navigate(
        `/products?search=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">
          <h2>ShopEase</h2>
        </Link>
      </div>

      <div className="nav-links">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/products">Products</Link></li>
          <li><Link to="/cart">Cart ({totalItems})</Link></li>

          {isAuthenticated && (
            <li>
              <Link to="/my-orders">My Orders</Link>
            </li>
          )}

          {isAuthenticated && user?.role === "admin" && (
            <li>
              <Link to="/admin">Admin</Link>
            </li>
          )}
        </ul>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for products..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <button type="submit">Search</button>
      </form>

      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <span className="welcome-user">
              Welcome, {user.name}!
            </span>

            <button onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">
            <button>Login</button>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
