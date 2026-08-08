const mongoose = require('mongoose');

/**
 * Establishes connection with MongoDB database using Mongoose.
 */
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      'mongodb+srv://muhammedrahees159_db_user:rlYX6vkA4U6jKd17@packocluster.smmnsni.mongodb.net/?appName=packoCluster';

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables or .env file');
    }

    const connectionInstance = await mongoose.connect(mongoURI);
    console.log(`\n✅ MongoDB Connected Successfully! Host: ${connectionInstance.connection.host}`);
    console.log(`   Database Name: ${connectionInstance.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
