const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

// Convenience endpoint to populate or reset demo data
router.all('/seed', async (req, res, next) => {
  try {
    const seedData = require('../seeds/seedData');
    await seedData(false);
    res.status(200).json({
      success: true,
      message: 'Demo records successfully seeded into database.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
