const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  archiveBook,
  addBookCopies
} = require('../controllers/bookController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateObjectId } = require('../middleware/validate');

router.get('/', getBooks);
router.get('/:id', validateObjectId('id'), getBookById);

// Protected routes (Admin, Librarian)
router.post('/', verifyToken, authorize('admin', 'librarian'), createBook);
router.put('/:id', verifyToken, authorize('admin', 'librarian'), validateObjectId('id'), updateBook);
router.post('/:id/copies', verifyToken, authorize('admin', 'librarian'), validateObjectId('id'), addBookCopies);

// Admin-only routes
router.patch('/:id/archive', verifyToken, authorize('admin'), validateObjectId('id'), archiveBook);

module.exports = router;
