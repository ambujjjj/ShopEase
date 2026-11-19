
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";

import {
  createOrder,
  createPaymentOrder,
  getPendingOnlineOrder,
  verifyPayment,
} from "../services/orderService";

import "./Checkout.css";

// Load Razorpay Checkout SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const scriptUrl =
      "https://checkout.razorpay.com/v1/checkout.js";

    const existingScript = document.querySelector(
      `script[src="${scriptUrl}"]`
    );

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });

      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });

      return;
    }

    const script = document.createElement("script");

    script.src = scriptUrl;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

function Checkout() {
  const {
    cartItems,
    totalPrice,
    totalItems,
    clearCart,
  } = useContext(CartContext);

  const { user, token } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [showReview, setShowReview] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  // Stores an unpaid online order so payment can be retried
  const [pendingOnlineOrder, setPendingOnlineOrder] = useState(null);

  // Prevents the empty-cart screen appearing before order recovery
  const [checkingPendingOrder, setCheckingPendingOrder] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Recover an existing pending online order after page refresh
  useEffect(() => {
    let isMounted = true;

    const restorePendingOrder = async () => {
      if (!token) {
        if (isMounted) {
          setCheckingPendingOrder(false);
        }
        return;
      }

      try {
        const response = await getPendingOnlineOrder(token);

        if (!isMounted) return;

        const order = response.order;

        if (
          order &&
          order.paymentMethod === "Online" &&
          order.paymentStatus !== "Paid" &&
          order.orderStatus === "Pending"
        ) {
          setPendingOnlineOrder(order);
          setPaymentMethod("Online");

          // Restore saved delivery information
          setFormData((previousData) => ({
            ...previousData,
            fullName:
              order.shippingAddress?.fullName ||
              previousData.fullName,
            phone:
              order.shippingAddress?.phone ||
              previousData.phone,
            address:
              order.shippingAddress?.address ||
              previousData.address,
            city:
              order.shippingAddress?.city ||
              previousData.city,
            state:
              order.shippingAddress?.state ||
              previousData.state,
            pincode:
              order.shippingAddress?.postalCode ||
              previousData.pincode,
            country:
              order.shippingAddress?.country ||
              previousData.country,
          }));

          // Go directly to order review
          setShowReview(true);
        }
      } catch (err) {
        console.error(
          "Pending order recovery failed:",
          err.message
        );

        if (isMounted) {
          setError(
            "Unable to check your pending order. Please refresh the page."
          );
        }
      } finally {
        if (isMounted) {
          setCheckingPendingOrder(false);
        }
      }
    };

    restorePendingOrder();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle delivery form changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Validate and show order review
  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");
    setShowReview(true);
  };

  // Show successful order confirmation
  const showOrderConfirmation = (order) => {
    const address = order.shippingAddress || {};

    setOrderDetails({
      ...order,
      customer: {
        fullName: address.fullName || formData.fullName,
        email: formData.email,
        phone: address.phone || formData.phone,
        address: address.address || formData.address,
        city: address.city || formData.city,
        state: address.state || formData.state,
        pincode: address.postalCode || formData.pincode,
        country: address.country || formData.country,
      },
    });

    setPendingOnlineOrder(null);
    clearCart();
  };

  // Handle Cash on Delivery
  const handleCashOnDelivery = async (orderData) => {
    const response = await createOrder(orderData, token);

    if (!response.order) {
      throw new Error("Order creation response is invalid.");
    }

    showOrderConfirmation(response.order);
  };

  // Handle Razorpay Online Payment
  const handleOnlinePayment = async (orderData) => {
    // Load Razorpay Checkout
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      throw new Error(
        "Unable to load Razorpay Checkout. Please try again."
      );
    }

    let shopEaseOrder;

    // Reuse the recovered pending order when available
    if (
      pendingOnlineOrder &&
      pendingOnlineOrder.paymentStatus !== "Paid" &&
      pendingOnlineOrder.orderStatus === "Pending"
    ) {
      shopEaseOrder = pendingOnlineOrder;
    } else {
      // Create a new ShopEase order only when necessary
      const orderResponse = await createOrder(orderData, token);

      if (!orderResponse.order?._id) {
        throw new Error("Failed to create ShopEase order.");
      }

      shopEaseOrder = orderResponse.order;

      // Save it immediately for retries and page refreshes
      setPendingOnlineOrder(shopEaseOrder);
    }

    // Create or retrieve the corresponding Razorpay order
    const paymentData = await createPaymentOrder(
      shopEaseOrder._id,
      token
    );

    if (!paymentData.razorpayOrderId) {
      throw new Error(
        "Razorpay order information is missing."
      );
    }

    // Configure Razorpay Checkout
    const options = {
      key: paymentData.keyId,
      amount: paymentData.amount,
      currency: paymentData.currency,

      name: "ShopEase",
      description: "Payment for your ShopEase order",

      order_id: paymentData.razorpayOrderId,

      prefill: {
        name: formData.fullName,
        email: formData.email,
        contact: formData.phone,
      },

      theme: {
        color: "#2874f0",
      },

      handler: async (razorpayResponse) => {
        try {
          setError("");

          // Verify payment through our backend
          const verificationResponse = await verifyPayment(
            {
              razorpay_order_id:
                razorpayResponse.razorpay_order_id,

              razorpay_payment_id:
                razorpayResponse.razorpay_payment_id,

              razorpay_signature:
                razorpayResponse.razorpay_signature,
            },
            token
          );

          const verifiedOrder = verificationResponse.order;

          if (!verifiedOrder) {
            throw new Error(
              "Payment verification response is invalid."
            );
          }

          // Confirm order only after successful verification
          showOrderConfirmation(verifiedOrder);
        } catch (err) {
          setError(
            err.message || "Payment verification failed."
          );
        } finally {
          setLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setLoading(false);

          setError(
            "Payment was not completed. Your order and cart have been preserved. You can retry payment."
          );
        },
      },
    };

    const razorpayInstance = new window.Razorpay(options);

    // Handle payment failures
    razorpayInstance.on("payment.failed", (response) => {
      setLoading(false);

      setError(
        response.error?.description ||
          "Payment failed. Please try again."
      );
    });

    razorpayInstance.open();
  };

  // Place order through backend
  const handlePlaceOrder = async () => {
    if (!token) {
      setError("Please login before placing an order.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Use saved order items when recovering a pending order
      const orderItems = pendingOnlineOrder
        ? pendingOnlineOrder.orderItems.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          }))
        : cartItems.map((item) => ({
            product: item.id || item._id,
            quantity: item.quantity,
          }));

      const orderData = {
        orderItems,

        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.pincode,
          country: formData.country,
        },

        paymentMethod,
      };

      if (paymentMethod === "COD") {
        await handleCashOnDelivery(orderData);
      } else {
        await handleOnlinePayment(orderData);
      }
    } catch (err) {
      setError(err.message || "Failed to place order.");
      setLoading(false);
    }
  };

  // Display a loading state while checking for pending orders
  if (checkingPendingOrder) {
    return (
      <div className="checkout-page">
        <h2>Preparing your checkout...</h2>
        <p>Checking for an existing pending order.</p>
      </div>
    );
  }

  // Show order confirmation
  if (orderDetails) {
    return (
      <div className="order-confirmation">
        <div className="confirmation-icon">✓</div>

        <h1>Order Placed Successfully!</h1>

        <p>Thank you for shopping with ShopEase.</p>

        <div className="confirmation-details">
          <p>
            <strong>Order ID:</strong> {orderDetails._id}
          </p>

          <p>
            <strong>Order Date:</strong>{" "}
            {new Date(orderDetails.createdAt).toLocaleDateString()}
          </p>

          <p>
            <strong>Total Items:</strong>{" "}
            {orderDetails.orderItems.reduce(
              (total, item) => total + item.quantity,
              0
            )}
          </p>

          <p>
            <strong>Total Amount:</strong> ₹
            {orderDetails.totalAmount}
          </p>

          <p>
            <strong>Payment Method:</strong>{" "}
            {orderDetails.paymentMethod}
          </p>

          <p>
            <strong>Payment Status:</strong>{" "}
            {orderDetails.paymentStatus}
          </p>

          {orderDetails.paymentId && (
            <p>
              <strong>Payment ID:</strong>{" "}
              {orderDetails.paymentId}
            </p>
          )}

          <p>
            <strong>Order Status:</strong>{" "}
            {orderDetails.orderStatus}
          </p>
        </div>

        <h3>Delivery Address</h3>

        <div className="confirmation-address">
          <p>{orderDetails.customer.fullName}</p>
          <p>{orderDetails.customer.address}</p>

          <p>
            {orderDetails.customer.city},{" "}
            {orderDetails.customer.state} -{" "}
            {orderDetails.customer.pincode}
          </p>

          <p>{orderDetails.customer.phone}</p>
          <p>{orderDetails.customer.country}</p>
        </div>

        <h3>Purchased Products</h3>

        <div className="confirmation-products">
          {orderDetails.orderItems.map((item, index) => (
            <div
              key={item._id || `${item.product}-${index}`}
              className="checkout-item"
            >
              <span>
                {item.name} × {item.quantity}
              </span>

              <span>
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <Link to="/" className="checkout-submit">
          Continue Shopping
        </Link>
      </div>
    );
  }

  // Handle empty cart when there is no pending order
  if (cartItems.length === 0 && !pendingOnlineOrder) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty!</h2>
        <Link to="/products">Continue Shopping</Link>
      </div>
    );
  }

  // Use pending order details when recovering an order
  const checkoutItems = pendingOnlineOrder
    ? pendingOnlineOrder.orderItems
    : cartItems;

  const checkoutTotal = pendingOnlineOrder
    ? pendingOnlineOrder.totalAmount
    : totalPrice;

  const checkoutItemCount = pendingOnlineOrder
    ? pendingOnlineOrder.orderItems.reduce(
        (total, item) => total + item.quantity,
        0
      )
    : totalItems;

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      {!showReview ? (
        <div className="checkout-container">
          {/* Delivery Information Form */}
          <form
            className="shipping-form"
            onSubmit={handleSubmit}
          >
            <h2>Delivery Information</h2>

            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter 10-digit phone number"
              pattern="[0-9]{10}"
              required
            />

            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="House number, street, area"
              required
            />

            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter your city"
              required
            />

            <label>State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter your state"
              required
            />

            <label>PIN Code</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter 6-digit PIN code"
              pattern="[0-9]{6}"
              required
            />

            <label>Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
            />

            <label>Payment Method</label>

            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value)
              }
              required
            >
              <option value="COD">Cash on Delivery</option>
              <option value="Online">Online Payment</option>
            </select>

            <button
              type="submit"
              className="checkout-submit"
            >
              Review Order
            </button>
          </form>

          {/* Order Summary */}
          <div className="checkout-summary">
            <h2>Order Summary</h2>

            {cartItems.map((item) => (
              <div
                className="checkout-item"
                key={item.id || item._id}
              >
                <span>
                  {item.name} × {item.quantity}
                </span>

                <span>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}

            <div className="checkout-total">
              <span>Total Items: {totalItems}</span>
              <strong>₹{totalPrice}</strong>
            </div>
          </div>
        </div>
      ) : (
        /* Order Review */
        <div className="order-review">
          <h2>Review Your Order</h2>

          {pendingOnlineOrder && (
            <p className="error-message">
              You have an existing pending online order. Your
              previous order details have been restored. Retry
              payment to complete it.
            </p>
          )}

          <div className="review-section">
            <h3>Delivery Address</h3>

            <p>{formData.fullName}</p>
            <p>{formData.email}</p>
            <p>{formData.phone}</p>
            <p>{formData.address}</p>

            <p>
              {formData.city}, {formData.state} -{" "}
              {formData.pincode}
            </p>

            <p>{formData.country}</p>
          </div>

          <div className="review-section">
            <h3>Order Items</h3>

            {checkoutItems.map((item, index) => (
              <div
                className="checkout-item"
                key={item._id || item.id || `${item.product}-${index}`}
              >
                <span>
                  {item.name} × {item.quantity}
                </span>

                <span>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}

            <div className="checkout-total">
              <strong>Total Items</strong>
              <strong>{checkoutItemCount}</strong>
            </div>

            <div className="checkout-total">
              <strong>Total Amount</strong>
              <strong>₹{checkoutTotal}</strong>
            </div>

            <p>
              <strong>Payment Method:</strong>{" "}
              {paymentMethod === "COD"
                ? "Cash on Delivery"
                : "Online Payment"}
            </p>
          </div>

          {error && (
            <p className="error-message">{error}</p>
          )}

          <button
            className="checkout-submit"
            onClick={() => {
              setShowReview(false);
              setError("");
            }}
            disabled={loading || Boolean(pendingOnlineOrder)}
          >
            Edit Delivery Details
          </button>

          <button
            className="place-order-button"
            onClick={handlePlaceOrder}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : paymentMethod === "COD"
                ? "Place Order"
                : "Pay Now"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Checkout;
