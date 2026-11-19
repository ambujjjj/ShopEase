
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const {
  handleRazorpayWebhook,
} = require("./controllers/paymentController");

const startOrderExpiryScheduler = require("./services/orderExpiryService");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Razorpay webhook must receive the original raw body
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);

// Parse JSON for other API requests
app.use(express.json());

// Backend health check
app.get("/", (req, res) => {
  res.send("ShopEase Backend is Running!");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

// Start backend
const startServer = async () => {
  try {
    await connectDB();

    // Start automatic order expiry checks
    startOrderExpiryScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
