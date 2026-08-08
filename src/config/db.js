const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error("Error:", error.message);
    console.error("Name:", error.name);
    console.error("Code:", error.code || "N/A");

    process.exit(1);
  }
};

module.exports = connectDB;