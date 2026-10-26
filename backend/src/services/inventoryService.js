const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');

/**
 * Atomically reserve or issue an available copy of a book
 * Ensures concurrency safety against race conditions
 */
const allocateAvailableCopy = async (bookId, preferredCopyBarcode = null) => {
  let query = { bookId, status: 'available' };
  if (preferredCopyBarcode) {
    query.barcode = preferredCopyBarcode;
  }

  // Atomically find one available copy and mark it borrowed
  const copy = await BookCopy.findOneAndUpdate(
    query,
    { $set: { status: 'borrowed' } },
    { new: true }
  );

  if (!copy) {
    throw new Error('No available copy found for this book');
  }

  // Atomically decrement availableCopies and increment borrowedCopies
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1, borrowedCopies: 1 } },
    { new: true }
  );

  if (!book) {
    // Rollback copy status if book inventory count update failed
    await BookCopy.findByIdAndUpdate(copy._id, { $set: { status: 'available' } });
    throw new Error('Inventory count mismatch: book has no available copies recorded');
  }

  return { book, copy };
};

/**
 * Atomically return a borrowed copy and restore inventory
 */
const returnBorrowedCopy = async (copyId) => {
  const copy = await BookCopy.findOneAndUpdate(
    { _id: copyId, status: 'borrowed' },
    { $set: { status: 'available' } },
    { new: true }
  );

  if (!copy) {
    throw new Error('Copy is not currently marked as borrowed or does not exist');
  }

  // Atomically increment availableCopies and decrement borrowedCopies
  const book = await Book.findOneAndUpdate(
    { _id: copy.bookId, borrowedCopies: { $gt: 0 } },
    { $inc: { availableCopies: 1, borrowedCopies: -1 } },
    { new: true }
  );

  if (!book) {
    // If borrowedCopies was 0, fallback to safe sync
    await Book.findByIdAndUpdate(copy.bookId, {
      $inc: { availableCopies: 1 }
    });
  }

  return { book, copy };
};

/**
 * Recalculate book copy counts directly from BookCopy collection
 */
const syncBookInventoryCounts = async (bookId) => {
  const total = await BookCopy.countDocuments({ bookId });
  const available = await BookCopy.countDocuments({ bookId, status: 'available' });
  const borrowed = await BookCopy.countDocuments({ bookId, status: 'borrowed' });
  const reserved = await BookCopy.countDocuments({ bookId, status: 'reserved' });

  const updatedBook = await Book.findByIdAndUpdate(
    bookId,
    {
      totalCopies: total,
      availableCopies: available,
      borrowedCopies: borrowed,
      reservedCopies: reserved
    },
    { new: true }
  );

  return updatedBook;
};

module.exports = {
  allocateAvailableCopy,
  returnBorrowedCopy,
  syncBookInventoryCounts
};
