
import { useEffect, useState, useContext } from "react";

import { AuthContext } from "../context/AuthContext";

import {
  getAllOrders,
  updateOrderStatus,
} from "../services/orderService";

import "./AdminOrders.css";

const orderStatuses = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function AdminOrders() {
  const { token } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState({});

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllOrders(token);

      const fetchedOrders = Array.isArray(data)
        ? data
        : data.orders || [];

      setOrders(fetchedOrders);

      const initialStatuses = {};

      fetchedOrders.forEach((order) => {
        initialStatuses[order._id] = order.orderStatus;
      });

      setSelectedStatuses(initialStatuses);
    } catch (err) {
      setError(err.message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleStatusChange = (orderId, newStatus) => {
    setSelectedStatuses((previousStatuses) => ({
      ...previousStatuses,
      [orderId]: newStatus,
    }));
  };

  const handleUpdateStatus = async (orderId) => {
    const newStatus = selectedStatuses[orderId];

    try {
      setUpdatingId(orderId);
      setError("");
      setSuccess("");

      const data = await updateOrderStatus(
        orderId,
        newStatus,
        token
      );

      const updatedOrder = data.order || data;

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderId
            ? updatedOrder
            : order
        )
      );

      setSuccess("Order status updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="admin-orders">
      <div className="admin-orders-header">
        <div>
          <h1>Order Management</h1>
          <p>View and manage all customer orders.</p>
        </div>
      </div>

      {success && (
        <p className="admin-order-success">{success}</p>
      )}

      {error && (
        <p className="admin-order-error">{error}</p>
      )}

      {loading ? (
        <p className="admin-order-loading">
          Loading customer orders...
        </p>
      ) : orders.length === 0 ? (
        <p className="admin-order-empty">
          No customer orders found.
        </p>
      ) : (
        <div className="admin-orders-list">
          {orders.map((order) => (
            <div className="admin-order-card" key={order._id}>
              <div className="admin-order-top">
                <div>
                  <h3>Order #{order._id.slice(-8)}</h3>

                  <p>
                    Placed on: {formatDate(order.createdAt)}
                  </p>

                  <p>
                    Customer: {order.user?.name || "Customer"}
                  </p>

                  <p>
                    Email: {order.user?.email || "Not available"}
                  </p>
                </div>

                <span className="order-status-badge">
                  {order.orderStatus}
                </span>
              </div>

              <div className="admin-order-items">
                <h4>Ordered Products</h4>

                {order.orderItems.map((item, index) => (
                  <div
                    className="admin-order-item"
                    key={item._id || `${item.product}-${index}`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                    />

                    <div>
                      <p>{item.name}</p>
                      <span>
                        ₹{item.price} × {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-order-bottom">
                <div className="admin-order-payment">
                  <p>
                    Payment Method: {order.paymentMethod}
                  </p>

                  <p>
                    Payment Status: {order.paymentStatus}
                  </p>

                  <h4>
                    Total: ₹{order.totalAmount}
                  </h4>
                </div>

                <div className="admin-order-status-control">
                  <label>Update Order Status</label>

                  <select
                    value={
                      selectedStatuses[order._id] ||
                      order.orderStatus
                    }
                    onChange={(event) =>
                      handleStatusChange(
                        order._id,
                        event.target.value
                      )
                    }
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() =>
                      handleUpdateStatus(order._id)
                    }
                    disabled={
                      updatingId === order._id ||
                      selectedStatuses[order._id] ===
                        order.orderStatus
                    }
                  >
                    {updatingId === order._id
                      ? "Updating..."
                      : "Update Status"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
