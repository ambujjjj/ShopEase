
const cron = require("node-cron");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const razorpay = require("../config/razorpay");

const ORDER_EXPIRY_MINUTES = 30;

const restoreStock = async (order, session) => {
  for (const item of order.orderItems) {
    const result = await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(`Could not restore stock for ${item.name}.`);
    }
  }
};

const expirePendingOrders = async () => {
  const expiryTime = new Date(
    Date.now() - ORDER_EXPIRY_MINUTES * 60 * 1000
  );

  const pendingOrders = await Order.find({
    paymentMethod: "Online",
    paymentStatus: { $ne: "Paid" },
    orderStatus: "Pending",
    createdAt: { $lte: expiryTime },
  }).select("_id razorpayOrderId");

  for (const candidate of pendingOrders) {
    let razorpayStatus = candidate.razorpayOrderId
      ? "unavailable"
      : "not_created";

    let capturedPayment = null;
    let hasAuthorizedPayment = false;

    if (candidate.razorpayOrderId) {
      try {
        const paymentOrder = await razorpay.orders.fetch(
          candidate.razorpayOrderId
        );

        razorpayStatus = paymentOrder.status;

        const paymentsResponse =
          await razorpay.orders.fetchPayments(
            candidate.razorpayOrderId
          );

        const payments = paymentsResponse.items || [];

        capturedPayment = payments.find(
          (payment) =>
            payment.status === "captured" &&
            payment.order_id === candidate.razorpayOrderId &&
            payment.currency === "INR"
        ) || null;

        hasAuthorizedPayment = payments.some(
          (payment) =>
            payment.status === "authorized" &&
            payment.order_id === candidate.razorpayOrderId
        );

        if (capturedPayment) {
          razorpayStatus = "paid";
        }
      } catch (error) {
        console.error(
          `Could not verify Razorpay order ${candidate.razorpayOrderId}:`,
          error.message
        );

        // Do not release stock when payment status is unknown.
        continue;
      }
    }

    if (hasAuthorizedPayment && razorpayStatus !== "paid") {
      console.log(
        `Order ${candidate._id} has an authorized payment. Skipping expiry.`
      );
      continue;
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const order = await Order.findOne({
          _id: candidate._id,
          razorpayOrderId: candidate.razorpayOrderId,
          paymentMethod: "Online",
          paymentStatus: { $ne: "Paid" },
          orderStatus: "Pending",
          createdAt: { $lte: expiryTime },
        }).session(session);

        if (!order) {
          return;
        }

        if (razorpayStatus === "paid") {
          if (
            !capturedPayment ||
            capturedPayment.amount !==
              Math.round(order.totalAmount * 100)
          ) {
            console.error(
              `Captured payment details do not match ShopEase order ${order._id}.`
            );
            return;
          }

          order.paymentStatus = "Paid";
          order.paymentId = capturedPayment.id;

          await order.save({ session });

          console.log(
            `Order ${order._id} marked as paid after Razorpay verification.`
          );

          return;
        }

        if (razorpayStatus === "unavailable") {
          return;
        }

        // No Razorpay order was created, or Razorpay confirms
        // the order is still unpaid.
        await restoreStock(order, session);

        order.orderStatus = "Cancelled";
        order.paymentStatus = "Failed";

        await order.save({ session });

        console.log(
          `Expired order ${order._id}. Stock restored.`
        );
      });
    } catch (error) {
      console.error(
        `Failed to process order ${candidate._id}:`,
        error.message
      );
    } finally {
      await session.endSession();
    }
  }
};

const startOrderExpiryScheduler = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("Checking for expired online orders...");
    await expirePendingOrders();
  });

  console.log("Order expiry scheduler started.");
};

module.exports = startOrderExpiryScheduler;
