const express = require('express');
const router = express.Router();
const {
  getFines,
  getMemberFines,
  recordPayment,
  waiveFine
} = require('../controllers/fineController');
const { verifyToken } = require('../middleware/auth');
const { authorize, enforceMemberIsolation } = require('../middleware/rbac');
const { validateObjectId } = require('../middleware/validate');

// Staff list all fines
router.get('/', verifyToken, authorize('admin', 'librarian'), getFines);

// Member or Staff view member fines
router.get('/member/:id', verifyToken, validateObjectId('id'), enforceMemberIsolation('id'), getMemberFines);

// Staff record payment
router.post('/:id/pay', verifyToken, authorize('admin', 'librarian'), validateObjectId('id'), recordPayment);

// Admin-only waive fine
router.patch('/:id/waive', verifyToken, authorize('admin'), validateObjectId('id'), waiveFine);

module.exports = router;
