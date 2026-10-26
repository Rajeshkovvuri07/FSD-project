const express = require('express');
const router = express.Router();
const {
  issueBook,
  returnBook,
  renewLoan,
  getActiveLoans,
  getOverdueLoans
} = require('../controllers/circulationController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Staff-managed circulation actions
router.post('/issue', verifyToken, authorize('admin', 'librarian'), issueBook);
router.post('/return', verifyToken, authorize('admin', 'librarian'), returnBook);
router.get('/active', verifyToken, authorize('admin', 'librarian'), getActiveLoans);
router.get('/overdue', verifyToken, authorize('admin', 'librarian'), getOverdueLoans);

// Renew loan can be performed by staff or by the member themselves
router.post('/renew/:loanId', verifyToken, renewLoan);

module.exports = router;
