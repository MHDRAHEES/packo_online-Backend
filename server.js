require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect Database & Start Server
connectDB()
  .then(() => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n🚀 Express Server running in ${process.env.NODE_ENV || 'development'} mode:`);
      console.log(`- Local:   http://localhost:${PORT}/api/v1`);
      console.log(`- Network: http://192.168.0.76:${PORT}/api/v1`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/v1/health\n`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error('💥 UNHANDLED REJECTION! Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
  });
