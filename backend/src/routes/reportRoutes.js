const express = require('express');
const router = express.Router();
const {
  exportCirculationCSV,
  exportInventoryCSV
} = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/circulation/csv', verifyToken, authorize('admin', 'librarian'), exportCirculationCSV);
router.get('/inventory/csv', verifyToken, authorize('admin', 'librarian'), exportInventoryCSV);

module.exports = router;
