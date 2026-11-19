
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const razorpay = require("../config/razorpay");

// Restore reserved product stock
const restoreOrderStock = async (order, session) => {
  for (const item of order.orderItems) {
    const stockUpdate = await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      { session }
    );

    if (stockUpdate.modifiedCount !== 1) {
      throw new Error(`Could not restore stock for ${item.name}.`);
    }
  }
};

// Check Razorpay before cancelling an online order
const checkOnlinePayment = async (order) => {
  if (order.paymentMethod !== "Online" || !order.razorpayOrderId) {
    return { paid: false, authorized: false };
  }

  const paymentOrder = await razorpay.orders.fetch(
    order.razorpayOrderId
  );

  const paymentsResponse = await razorpay.orders.fetchPayments(
    order.razorpayOrderId
  );

  const payments = paymentsResponse.items || [];

  const capturedPayment = payments.find(
    (payment) => payment.status === "captured"
  );

  const authorizedPayment = payments.find(
    (payment) => payment.status === "authorized"
  );

  if (paymentOrder.status === "paid" || capturedPayment) {
    return {
      paid: true,
      paymentId: capturedPayment?.id || null,
    };
  }

  if (authorizedPayment) {
    return { paid: false, authorized: true };
  }

  return { paid: false, authorized: false };
};

// Create a new order
const createOrder = async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({
      message: "No products provided for the order.",
    });
  }

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({
      message: "Shipping address and payment method are required.",
    });
  }

  if (!["COD", "Online"].includes(paymentMethod)) {
    return res.status(400).json({
      message: "Invalid payment method.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const validatedItems = [];
      let totalAmount = 0;

      for (const item of orderItems) {
        const { product: productId, quantity } = item;

        if (
          !mongoose.Types.ObjectId.isValid(productId) ||
          !Number.isInteger(quantity) ||
          quantity < 1
        ) {
          throw new Error("Invalid product ID or quantity.");
        }

        const product = await Product.findById(productId).session(session);

        if (!product) {
          throw new Error("One or more products were not found.");
        }

        const stockUpdate = await Product.updateOne(
          {
            _id: productId,
            stock: { $gte: quantity },
          },
          {
            $inc: { stock: -quantity },
          },
          { session }
        );

        if (stockUpdate.modifiedCount !== 1) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }

        validatedItems.push({
          product: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity,
        });

        totalAmount += product.price * quantity;
      }

      const orders = await Order.create(
        [
          {
            user: req.user._id,
            orderItems: validatedItems,
            shippingAddress,
            paymentMethod,
            paymentStatus: "Pending",
            orderStatus: "Pending",
            totalAmount,
          },
        ],
        { session }
      );

      createdOrder = orders[0];
    });

    return res.status(201).json({
      message: "Order placed successfully!",
      order: createdOrder,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Failed to create order.",
    });
  } finally {
    await session.endSession();
  }
};

// Get orders belonging to the logged-in customer
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch your orders.",
    });
  }
};

// Get the customer's existing pending online order
const getPendingOnlineOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      user: req.user._id,
      paymentMethod: "Online",
      paymentStatus: { $ne: "Paid" },
      orderStatus: "Pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      order: order || null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch pending online order:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to fetch pending online order.",
    });
  }
};

// Get all customer orders (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch orders.",
    });
  }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res) => {
  const { orderStatus } = req.body;

  const allowedStatuses = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({
      message: "Invalid order status.",
    });
  }

  try {
    // Check the order before starting the cancellation transaction.
    if (orderStatus === "Cancelled") {
      const existingOrder = await Order.findById(req.params.id);

      if (!existingOrder) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      if (existingOrder.orderStatus === "Cancelled") {
        return res.status(200).json({
          message: "Order is already cancelled.",
          order: existingOrder,
        });
      }

      if (existingOrder.paymentStatus === "Paid") {
        return res.status(400).json({
          message:
            "This order is already paid. Process a refund before cancelling it.",
        });
      }

      // Verify actual Razorpay payment status for online orders.
      if (existingOrder.paymentMethod === "Online") {
        let paymentCheck;

        try {
          paymentCheck = await checkOnlinePayment(existingOrder);
        } catch (error) {
          console.error(
            "Admin Razorpay cancellation check failed:",
            error.message
          );

          return res.status(503).json({
            message:
              "Unable to verify payment status. Please try again.",
          });
        }

        if (paymentCheck.paid) {
          await Order.updateOne(
            {
              _id: existingOrder._id,
              paymentStatus: { $ne: "Paid" },
              orderStatus: { $ne: "Cancelled" },
            },
            {
              $set: {
                paymentStatus: "Paid",
                paymentId:
                  paymentCheck.paymentId || existingOrder.paymentId,
              },
            }
          );

          return res.status(400).json({
            message:
              "Payment was successful. Process a refund before cancelling this order.",
          });
        }

        if (paymentCheck.authorized) {
          return res.status(400).json({
            message:
              "Payment is authorized. Wait for its final status before cancelling.",
          });
        }
      }
    }

    const session = await mongoose.startSession();

    try {
      let updatedOrder;

      await session.withTransaction(async () => {
        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
          const error = new Error("Order not found.");
          error.statusCode = 404;
          throw error;
        }

        // A cancelled order cannot be reopened.
        if (
          order.orderStatus === "Cancelled" &&
          orderStatus !== "Cancelled"
        ) {
          const error = new Error(
            "A cancelled order cannot be reopened."
          );
          error.statusCode = 400;
          throw error;
        }

        // Avoid restoring stock more than once.
        if (order.orderStatus === "Cancelled") {
          updatedOrder = order;
          return;
        }

        // Paid orders require a refund before cancellation.
        if (
          orderStatus === "Cancelled" &&
          order.paymentStatus === "Paid"
        ) {
          const error = new Error(
            "This order is already paid. Process a refund before cancelling it."
          );
          error.statusCode = 400;
          throw error;
        }

        if (orderStatus === "Cancelled") {
          await restoreOrderStock(order, session);
        }

        order.orderStatus = orderStatus;

        await order.save({ session });

        updatedOrder = order;
      });

      return res.status(200).json({
        message: "Order status updated successfully!",
        order: updatedOrder,
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update order status.",
    });
  }
};

// Cancel an unpaid order (Customer)
const cancelMyOrder = async (req, res) => {
  try {
    const existingOrder = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (existingOrder.orderStatus === "Cancelled") {
      return res.status(200).json({
        message: "Order is already cancelled.",
        order: existingOrder,
      });
    }

    if (existingOrder.paymentStatus === "Paid") {
      return res.status(400).json({
        message:
          "This order has already been paid. Contact support for a refund.",
      });
    }

    if (existingOrder.orderStatus !== "Pending") {
      return res.status(400).json({
        message: "This order can no longer be cancelled online.",
      });
    }

    let paymentCheck = { paid: false, authorized: false };

    if (existingOrder.paymentMethod === "Online") {
      try {
        paymentCheck = await checkOnlinePayment(existingOrder);
      } catch (error) {
        console.error(
          "Razorpay cancellation check failed:",
          error.message
        );

        return res.status(503).json({
          message: "Unable to verify payment status. Please try again.",
        });
      }
    }

    if (paymentCheck.paid) {
      await Order.updateOne(
        {
          _id: existingOrder._id,
          paymentStatus: { $ne: "Paid" },
          orderStatus: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentStatus: "Paid",
            paymentId:
              paymentCheck.paymentId || existingOrder.paymentId,
          },
        }
      );

      return res.status(400).json({
        message:
          "Payment was successful. This order cannot be cancelled directly.",
      });
    }

    if (paymentCheck.authorized) {
      return res.status(400).json({
        message:
          "Payment is authorized. Please wait for its final status before cancelling.",
      });
    }

    const session = await mongoose.startSession();

    try {
      let cancelledOrder;

      await session.withTransaction(async () => {
        const order = await Order.findOne({
          _id: req.params.id,
          user: req.user._id,
        }).session(session);

        if (!order) {
          const error = new Error("Order not found.");
          error.statusCode = 404;
          throw error;
        }

        if (order.orderStatus === "Cancelled") {
          cancelledOrder = order;
          return;
        }

        if (
          order.paymentStatus === "Paid" ||
          order.orderStatus !== "Pending"
        ) {
          const error = new Error(
            "Order status changed. Refresh your orders and try again."
          );
          error.statusCode = 409;
          throw error;
        }

        await restoreOrderStock(order, session);

        order.orderStatus = "Cancelled";

        await order.save({ session });

        cancelledOrder = order;
      });

      return res.status(200).json({
        message: "Order cancelled successfully. Stock has been restored.",
        order: cancelledOrder,
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to cancel order.",
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getPendingOnlineOrder,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
};
