require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 8000;
const HOST = "0.0.0.0";

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION");
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION");
  console.error(err);
  process.exit(1);
});

const startServer = async () => {
  try {
    console.log("🚀 Starting backend...");
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("Port:", PORT);

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from environment variables");
    }

    await connectDB();

    const server = app.listen(PORT, HOST, () => {
      console.log("");
      console.log("🚀 Express Server Started");
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Port: ${PORT}`);
      console.log(`Host: ${HOST}`);
      console.log("");
    });

    server.on("error", (error) => {
      console.error("❌ HTTP Server Error:", error);
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