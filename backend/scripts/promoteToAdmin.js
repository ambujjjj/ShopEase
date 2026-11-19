
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

const promoteToAdmin = async () => {
  try {
    await connectDB();

    const email = "ambuj.test@example.com";

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { role: "admin" } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      console.log("User not found. Please check the email.");
      return;
    }

    console.log("User successfully promoted to admin!");
    console.log({
      name: user.name,
      email: user.email,
      role: user.role,
    });

  } catch (error) {
    console.error("Admin Promotion Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

promoteToAdmin();
