const mongoose = require('mongoose');

/**
 * Establishes connection with MongoDB database using Mongoose.
 */
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\n✅ MongoDB Connected Successfully! Host: ${connectionInstance.connection.host}`);
    console.log(`   Database Name: ${connectionInstance.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
