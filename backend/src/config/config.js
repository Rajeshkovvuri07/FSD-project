const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library_management',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_production_change_this_minimum_32_characters_long_12345',
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  borrowPeriodDays: parseInt(process.env.BORROW_PERIOD_DAYS, 10) || 14,
  fineRatePerDay: parseFloat(process.env.FINE_RATE_PER_DAY) || 1.00,
  maxFineAmount: parseFloat(process.env.MAX_FINE_AMOUNT) || 50.00,
  maxRenewals: parseInt(process.env.MAX_RENEWALS, 10) || 2,
  defaultBorrowingLimit: parseInt(process.env.DEFAULT_MEMBER_BORROWING_LIMIT, 10) || 5,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
