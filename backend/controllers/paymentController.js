
const crypto = require("crypto");

const razorpay = require("../config/razorpay");
const Order = require("../models/Order");

// Helper: compare payment details with the ShopEase order
const isValidCapturedPayment = (payment, order, razorpayOrderId) => {
  return (
    payment &&
    payment.order_id === razorpayOrderId &&
    payment.amount === Math.round(order.totalAmount * 100) &&
    payment.currency === "INR" &&
    payment.status === "captured"
  );
};

// CREATE OR REUSE RAZORPAY PAYMENT ORDER
const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        message: "ShopEase order ID is required.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.paymentMethod !== "Online") {
      return res.status(400).json({
        message: "This is not an online payment order.",
      });
    }

    if (order.paymentStatus === "Paid") {
      return res.status(400).json({
        message: "This order has already been paid.",
      });
    }

    if (order.orderStatus !== "Pending") {
      return res.status(400).json({
        message: "This order is not available for payment.",
      });
    }

    let razorpayOrder;

    // REUSE EXISTING RAZORPAY ORDER WHEN POSSIBLE
    if (order.razorpayOrderId) {
      try {
        const existingRazorpayOrder =
          await razorpay.orders.fetch(order.razorpayOrderId);

        const expectedAmount = Math.round(
          order.totalAmount * 100
        );

        if (
          existingRazorpayOrder.amount !== expectedAmount ||
          existingRazorpayOrder.currency !== "INR"
        ) {
          return res.status(400).json({
            message: "Existing Razorpay order details do not match.",
          });
        }

        // Razorpay orders with created or attempted status
        // can be reused for another payment attempt.
        if (
          existingRazorpayOrder.status === "created" ||
          existingRazorpayOrder.status === "attempted"
        ) {
          razorpayOrder = existingRazorpayOrder;
        } else if (existingRazorpayOrder.status === "paid") {
          // Check whether payment was captured but webhook
          // has not yet updated the ShopEase database.
          const paymentsResponse =
            await razorpay.orders.fetchPayments(
              order.razorpayOrderId
            );

          const capturedPayment = (
            paymentsResponse.items || []
          ).find((payment) =>
            isValidCapturedPayment(
              payment,
              order,
              order.razorpayOrderId
            )
          );

          if (capturedPayment) {
            order.paymentStatus = "Paid";
            order.paymentId = capturedPayment.id;

            await order.save();
          }

          return res.status(409).json({
            message: capturedPayment
              ? "Payment has already been completed. Please check My Orders."
              : "Razorpay reports this order as paid. Please contact support.",
          });
        } else {
          return res.status(400).json({
            message:
              "This Razorpay order cannot be reused. Please contact support.",
          });
        }
      } catch (error) {
        console.error(
          "Existing Razorpay Order Fetch Error:",
          error.message
        );

        return res.status(503).json({
          message:
            "Unable to verify the existing payment order. Please try again.",
        });
      }
    } else {
      // CREATE A NEW RAZORPAY ORDER ONLY WHEN NONE EXISTS
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        receipt: order._id.toString(),
      });

      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
    }

    return res.status(200).json({
      message: "Razorpay payment order is ready.",
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(
      "Razorpay Order Creation Error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to create Razorpay order.",
    });
  }
};

// VERIFY RAZORPAY PAYMENT
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Payment verification details are required.",
      });
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Associated ShopEase order not found.",
      });
    }

    if (order.paymentStatus === "Paid") {
      if (order.paymentId === razorpay_payment_id) {
        return res.status(200).json({
          message: "Payment has already been verified.",
          order,
        });
      }

      return res.status(409).json({
        message: "This order already has a different successful payment.",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        message: "This order has been cancelled. Contact support.",
      });
    }

    // VERIFY PAYMENT SIGNATURE
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        message: "Invalid payment signature format.",
      });
    }

    const receivedSignature = Buffer.from(
      razorpay_signature,
      "hex"
    );

    const expectedSignature = Buffer.from(
      generatedSignature,
      "hex"
    );

    if (
      !crypto.timingSafeEqual(
        receivedSignature,
        expectedSignature
      )
    ) {
      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    // FETCH ACTUAL PAYMENT DETAILS FROM RAZORPAY
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      !isValidCapturedPayment(
        payment,
        order,
        razorpay_order_id
      )
    ) {
      return res.status(400).json({
        message: "Payment details could not be verified.",
      });
    }

    // Atomically update only an order that is still eligible.
    // This prevents a normal cancellation from being overwritten.
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        razorpayOrderId: razorpay_order_id,
        paymentStatus: { $ne: "Paid" },
        orderStatus: { $ne: "Cancelled" },
      },
      {
        $set: {
          paymentStatus: "Paid",
          paymentId: razorpay_payment_id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedOrder) {
      const latestOrder = await Order.findById(order._id);

      if (
        latestOrder?.paymentStatus === "Paid" &&
        latestOrder.paymentId === razorpay_payment_id
      ) {
        return res.status(200).json({
          message: "Payment has already been verified.",
          order: latestOrder,
        });
      }

      return res.status(409).json({
        message:
          "Order status changed during payment verification. Contact support.",
      });
    }

    return res.status(200).json({
      message: "Payment verified successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Payment Verification Error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to verify payment.",
    });
  }
};

// HANDLE RAZORPAY WEBHOOK
const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (
      !webhookSecret ||
      !signature ||
      !Buffer.isBuffer(req.body)
    ) {
      return res.status(400).json({
        message: "Invalid webhook configuration or request body.",
      });
    }

    // VERIFY WEBHOOK SIGNATURE USING ORIGINAL RAW BODY
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(400).json({
        message: "Invalid webhook signature format.",
      });
    }

    const receivedSignature = Buffer.from(
      signature,
      "hex"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (
      !crypto.timingSafeEqual(
        receivedSignature,
        expectedBuffer
      )
    ) {
      return res.status(400).json({
        message: "Invalid webhook signature.",
      });
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.event;

    let payment = payload.payload?.payment?.entity;
    let razorpayOrderId = payment?.order_id;

    // HANDLE order.paid EVENT
    if (event === "order.paid") {
      const paidOrder = payload.payload?.order?.entity;

      razorpayOrderId = paidOrder?.id;

      if (!paidOrder || paidOrder.status !== "paid") {
        return res.status(200).json({
          message: "Order event received but not marked paid.",
        });
      }

      const shopOrder = await Order.findOne({
        razorpayOrderId,
      });

      if (!shopOrder) {
        return res.status(200).json({
          message: "No matching ShopEase order found.",
        });
      }

      if (
        paidOrder.amount !==
          Math.round(shopOrder.totalAmount * 100) ||
        paidOrder.currency !== "INR"
      ) {
        return res.status(400).json({
          message: "Webhook order details do not match.",
        });
      }

      // Retrieve the captured payment belonging to this order.
      const paymentsResponse =
        await razorpay.orders.fetchPayments(
          razorpayOrderId
        );

      payment = (paymentsResponse.items || []).find(
        (item) =>
          isValidCapturedPayment(
            item,
            shopOrder,
            razorpayOrderId
          )
      );

      if (!payment) {
        return res.status(200).json({
          message:
            "Paid order received. Awaiting captured payment details.",
        });
      }
    }

    // IGNORE UNRELATED EVENTS
    if (
      ![
        "payment.captured",
        "payment.failed",
        "order.paid",
      ].includes(event)
    ) {
      return res.status(200).json({
        message: "Webhook event acknowledged.",
      });
    }

    if (!razorpayOrderId) {
      return res.status(200).json({
        message: "Webhook received. No payment order found.",
      });
    }

    const order = await Order.findOne({
      razorpayOrderId,
    });

    if (!order) {
      return res.status(200).json({
        message: "No matching ShopEase order found.",
      });
    }

    // SUCCESSFUL PAYMENT
    if (
      event === "payment.captured" ||
      event === "order.paid"
    ) {
      if (
        !isValidCapturedPayment(
          payment,
          order,
          razorpayOrderId
        )
      ) {
        return res.status(400).json({
          message:
            "Webhook payment details do not match the order.",
        });
      }

      if (order.paymentStatus === "Paid") {
        if (order.paymentId === payment.id) {
          return res.status(200).json({
            message: "Payment was already processed.",
          });
        }

        console.error(
          "Different successful payment received for an already paid order:",
          order._id.toString()
        );

        return res.status(200).json({
          message:
            "Order already has a successful payment. Manual reconciliation required.",
        });
      }

      if (order.orderStatus === "Cancelled") {
        console.error(
          "Payment captured for a cancelled order:",
          order._id.toString()
        );

        return res.status(200).json({
          message: "Payment requires manual reconciliation.",
        });
      }

      // Atomically prevent payment status from overwriting
      // an order that has already been cancelled.
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          razorpayOrderId,
          paymentStatus: { $ne: "Paid" },
          orderStatus: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentStatus: "Paid",
            paymentId: payment.id,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedOrder) {
        console.error(
          "Order changed before webhook payment update:",
          order._id.toString()
        );

        return res.status(200).json({
          message:
            "Order changed during payment processing. Manual reconciliation may be required.",
        });
      }
    }

    // FAILED PAYMENT ATTEMPT
    else if (event === "payment.failed") {
      // Do not overwrite an already successful payment.
      await Order.updateOne(
        {
          _id: order._id,
          paymentStatus: { $ne: "Paid" },
          orderStatus: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentStatus: "Failed",
          },
        }
      );

      // Stock is intentionally NOT restored here.
      // The customer may retry payment.
    }

    return res.status(200).json({
      message: "Webhook processed successfully.",
    });
  } catch (error) {
    console.error(
      "Razorpay Webhook Error:",
      error.message
    );

    return res.status(500).json({
      message: "Webhook processing failed.",
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
};
