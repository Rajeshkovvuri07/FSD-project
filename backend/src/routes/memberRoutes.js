const express = require('express');
const router = express.Router();
const {
  getMembers,
  getMemberById,
  createMember,
  suspendMember,
  reactivateMember,
  getMemberLoans,
  getMemberReservations
} = require('../controllers/memberController');
const { verifyToken } = require('../middleware/auth');
const { authorize, enforceMemberIsolation } = require('../middleware/rbac');
const { validateObjectId } = require('../middleware/validate');

// Staff routes
router.get('/', verifyToken, authorize('admin', 'librarian'), getMembers);
router.post('/', verifyToken, authorize('admin', 'librarian'), createMember);
router.patch('/:id/suspend', verifyToken, authorize('admin', 'librarian'), validateObjectId('id'), suspendMember);
router.patch('/:id/reactivate', verifyToken, authorize('admin', 'librarian'), validateObjectId('id'), reactivateMember);

// Member isolation protected routes (Admins/Librarians or member querying self)
router.get('/:id', verifyToken, validateObjectId('id'), enforceMemberIsolation('id'), getMemberById);
router.get('/:id/loans', verifyToken, validateObjectId('id'), enforceMemberIsolation('id'), getMemberLoans);
router.get('/:id/reservations', verifyToken, validateObjectId('id'), enforceMemberIsolation('id'), getMemberReservations);

module.exports = router;
