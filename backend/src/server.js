const app = require('./app');
const config = require('./config/config');
const { connectDB } = require('./config/db');

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed initial catalog and user accounts if database is empty or missing core admin
    const User = require('./models/User');
    const adminExists = await User.findOne({ email: 'admin@library.com' });
    const userCount = await User.countDocuments();
    if (userCount === 0 || !adminExists) {
      console.log('[Server] Database needs initialization. Auto-seeding initial administrative and student demo accounts...');
      const seedData = require('./seeds/seedData');
      await seedData(false);
      console.log('[Server] Initial database seed successfully completed.');
    }

    const server = app.listen(config.port, () => {
      console.log(`[Server] Library Management API server running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async () => {
      console.log('[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`[Fatal Startup Error] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
