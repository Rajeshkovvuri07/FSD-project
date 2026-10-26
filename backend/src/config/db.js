const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

const connectDB = async (customUri) => {
  const uri = customUri || config.mongoUri;
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] MongoDB connection failed: ${error.message}`);
    console.error('[Database Guide] Ensure MongoDB is running locally at mongodb://127.0.0.1:27017 or provide a valid MONGODB_URI in backend/.env');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected cleanly.');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnection: () => mongoose.connection,
  isConnected: () => isConnected && mongoose.connection.readyState === 1
};
