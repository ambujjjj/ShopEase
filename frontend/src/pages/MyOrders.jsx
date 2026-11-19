
import { useContext, useEffect, useState } from "react";

import { AuthContext } from "../context/AuthContext";
import {
  getMyOrders,
  cancelOrder,
} from "../services/orderService";

function MyOrders() {
  const { token } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Fetch orders belonging to the logged-in customer
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyOrders(token);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || "Failed to fetch your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    } else {
      setError("Please login to view your orders.");
      setLoading(false);
    }
  }, [token]);

  // Cancel an unpaid order
  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order? The reserved product stock will be restored."
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      setCancelError("");
      setSuccessMessage("");

      const data = await cancelOrder(orderId, token);

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderId
            ? data.order
            : order
        )
      );

      setSuccessMessage(
        data.message || "Order cancelled successfully!"
      );
    } catch (err) {
      setCancelError(
        err.message || "Failed to cancel order."
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="my-orders-page">
        <h2>Loading your orders...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-orders-page">
        <h2>Unable to load orders</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <h1>My Orders</h1>
      <p>View your previous purchases and track their status.</p>

      {cancelError && (
        <p className="error-message">{cancelError}</p>
      )}

      {successMessage && (
        <p className="success-message">{successMessage}</p>
      )}

      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No orders yet!</h2>
          <p>Your orders will appear here after you make a purchase.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div className="order-card" key={order._id}>
              <div className="order-header">
                <div>
                  <h3>Order #{order._id}</h3>
                  <p>
                    Placed on:{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="order-status">
                  <p>
                    <strong>Order Status:</strong>{" "}
                    {order.orderStatus}
                  </p>
                  <p>
                    <strong>Payment:</strong>{" "}
                    {order.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="order-products">
                {order.orderItems.map((item) => (
                  <div
                    className="order-product"
                    key={item._id || item.product}
                  >
                    <img src={item.image} alt={item.name} />

                    <div>
                      <h4>{item.name}</h4>
                      <p>Quantity: {item.quantity}</p>
                      <p>Price: ₹{item.price}</p>
                    </div>

                    <strong>
                      ₹{item.price * item.quantity}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <p>
                  Payment Method: {order.paymentMethod}
                </p>

                <h3>Total: ₹{order.totalAmount}</h3>
              </div>

              {/* Cancel button for eligible unpaid orders */}
              {order.orderStatus === "Pending" &&
                order.paymentStatus !== "Paid" && (
                  <div className="order-actions">
                    <button
                      className="cancel-order-btn"
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={cancellingOrderId === order._id}
                    >
                      {cancellingOrderId === order._id
                        ? "Cancelling..."
                        : "Cancel Order"}
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
