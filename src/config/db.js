const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("🔄 MongoDB connection started...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }

    console.log("MongoDB URI found: YES");

    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log("✅ MongoDB Connected Successfully");
    console.log("📦 Database:", connection.connection.name);
    console.log("🌐 MongoDB Host:", connection.connection.host);

    return connection;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code || "N/A");

    // IMPORTANT:
    // Do NOT use process.exit(1) here.
    throw error;
  }
};

module.exports = connectDB;