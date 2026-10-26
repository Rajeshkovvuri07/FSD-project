const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/stats', verifyToken, authorize('admin', 'librarian'), getDashboardStats);

module.exports = router;
