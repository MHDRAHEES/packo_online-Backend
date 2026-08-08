require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";

// Handle Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION!");
  console.error("Name:", err.name);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  process.exit(1);
});

// Handle Unhandled Promise Rejections
process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION!");
  console.error("Error:", err);

  process.exit(1);
});

// Start Server
const startServer = async () => {
  try {
    console.log("🚀 Starting backend...");
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("Port:", PORT);

    // Check MongoDB environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("🔄 Connecting to MongoDB...");

    await connectDB();

    console.log("✅ MongoDB connection successful");

    const server = app.listen(PORT, HOST, () => {
      console.log("");
      console.log("🚀 Express Server Started");
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Port: ${PORT}`);
      console.log(`Host: ${HOST}`);
      console.log(`Health: /api/v1/health`);
      console.log("");
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("❌ Server Error:", error);
    });
  } catch (error) {
    console.error("");
    console.error("❌ SERVER STARTUP FAILED");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("");

    process.exit(1);
  }
};

startServer();