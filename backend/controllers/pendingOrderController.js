
const Order = require("../models/Order");

// Get the latest pending online order for the logged-in customer
const getPendingOnlineOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      user: req.user._id,
      paymentMethod: "Online",
      paymentStatus: { $ne: "Paid" },
      orderStatus: "Pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: order
        ? "Pending online order retrieved successfully."
        : "No pending online order found.",
      order,
    });
  } catch (error) {
    console.error(
      "Pending Online Order Retrieval Error:",
      error.message
    );

    return res.status(500).json({
      message: "Failed to retrieve pending online order.",
    });
  }
};

module.exports = {
  getPendingOnlineOrder,
};
