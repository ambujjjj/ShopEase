
const API_URL = "http://localhost:5000/api/orders";
const PAYMENT_API_URL = "http://localhost:5000/api/payments";

// Handle API responses
const handleResponse = async (response, defaultMessage) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || defaultMessage);
  }

  return data;
};

// Create a new ShopEase order
export const createOrder = async (orderData, token) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  return handleResponse(response, "Failed to create order.");
};

// Get orders belonging to the logged-in customer
export const getMyOrders = async (token) => {
  const response = await fetch(`${API_URL}/my-orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response, "Failed to fetch orders.");
};

// Get the customer's existing pending online order
export const getPendingOnlineOrder = async (token) => {
  const response = await fetch(`${API_URL}/pending-online`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(
    response,
    "Failed to fetch pending online order."
  );
};

// Get all orders (Admin)
export const getAllOrders = async (token) => {
  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response, "Failed to fetch orders.");
};

// Update order status (Admin)
export const updateOrderStatus = async (
  orderId,
  orderStatus,
  token
) => {
  const response = await fetch(`${API_URL}/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderStatus }),
  });

  return handleResponse(
    response,
    "Failed to update order status."
  );
};

// Cancel an order (Customer)
export const cancelOrder = async (orderId, token) => {
  const response = await fetch(`${API_URL}/${orderId}/cancel`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response, "Failed to cancel order.");
};

// Create or retrieve a Razorpay payment order
export const createPaymentOrder = async (orderId, token) => {
  const response = await fetch(`${PAYMENT_API_URL}/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  return handleResponse(
    response,
    "Failed to create payment order."
  );
};

// Verify Razorpay payment
export const verifyPayment = async (paymentData, token) => {
  const response = await fetch(`${PAYMENT_API_URL}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(paymentData),
  });

  return handleResponse(
    response,
    "Payment verification failed."
  );
};
