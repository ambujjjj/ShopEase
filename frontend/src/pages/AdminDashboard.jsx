
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

import { getAllProducts } from "../services/productService";
import { getAllOrders } from "../services/orderService";

import "./AdminDashboard.css";

function AdminDashboard() {
  const { user, token } = useContext(AuthContext);

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [productData, orderData] = await Promise.all([
          getAllProducts(),
          getAllOrders(token),
        ]);

        const products = Array.isArray(productData)
          ? productData
          : productData.products || [];

        const orders = Array.isArray(orderData)
          ? orderData
          : orderData.orders || [];

        const totalRevenue = orders.reduce(
          (total, order) => total + Number(order.totalAmount || 0),
          0
        );

        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue,
        });
      } catch (err) {
        setError(
          err.message || "Failed to load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.name}!</p>
        </div>

        <span className="admin-badge">Administrator</span>
      </div>

      <section className="admin-stats">
        {loading ? (
          <p>Loading store statistics...</p>
        ) : error ? (
          <p className="admin-dashboard-error">{error}</p>
        ) : (
          <>
            <div className="admin-stat-card">
              <h3>Total Products</h3>
              <p>{stats.totalProducts}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Total Orders</h3>
              <p>{stats.totalOrders}</p>
            </div>

            <div className="admin-stat-card">
              <h3>Total Revenue</h3>
              <p>₹{stats.totalRevenue.toLocaleString("en-IN")}</p>
            </div>
          </>
        )}
      </section>

      <section className="admin-overview">
        <div className="admin-card">
          <h3>Product Management</h3>
          <p>Add, edit and delete products from your store.</p>

          <Link to="/admin/products">
            Manage Products
          </Link>
        </div>

        <div className="admin-card">
          <h3>Order Management</h3>
          <p>View customer orders and update their status.</p>

          <Link to="/admin/orders">
            Manage Orders
          </Link>
        </div>
      </section>

      <section className="admin-information">
        <h2>Store Administration</h2>
        <p>
          Use this dashboard to manage your ShopEase store,
          products and customer orders.
        </p>
      </section>
    </div>
  );
}

export default AdminDashboard;
