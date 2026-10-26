const Reservation = require('../models/Reservation');
const BookCopy = require('../models/BookCopy');
const Book = require('../models/Book');

/**
 * Place a new reservation for a book
 */
const placeReservation = async (bookId, memberId) => {
  // Check for duplicate active reservation by the same member on this book
  const existingReservation = await Reservation.findOne({
    bookId,
    memberId,
    status: 'pending'
  });

  if (existingReservation) {
    throw new Error('You already have an active reservation for this book (Queue #' + existingReservation.queuePosition + ')');
  }

  // Determine next queue position
  const lastReservation = await Reservation.findOne({ bookId, status: 'pending' })
    .sort({ queuePosition: -1 });

  const queuePosition = lastReservation ? lastReservation.queuePosition + 1 : 1;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7); // 7 days reservation hold

  const reservation = await Reservation.create({
    bookId,
    memberId,
    queuePosition,
    expirationDate
  });

  // Increment reservedCopies on Book
  await Book.findByIdAndUpdate(bookId, { $inc: { reservedCopies: 1 } });

  return reservation;
};

/**
 * Cancel a reservation and shift subsequent queue positions
 */
const cancelReservation = async (reservationId, memberId = null, isAdminOrLibrarian = false) => {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.status !== 'pending') {
    throw new Error(`Cannot cancel reservation with status '${reservation.status}'`);
  }

  // Authorization check
  if (!isAdminOrLibrarian && reservation.memberId.toString() !== memberId.toString()) {
    throw new Error('Unauthorized to cancel another member\'s reservation');
  }

  const cancelledPos = reservation.queuePosition;
  const bookId = reservation.bookId;

  reservation.status = 'cancelled';
  await reservation.save();

  // Shift queue positions for remaining pending reservations
  await Reservation.updateMany(
    { bookId, status: 'pending', queuePosition: { $gt: cancelledPos } },
    { $inc: { queuePosition: -1 } }
  );

  // Decrement reservedCopies safely
  await Book.findOneAndUpdate(
    { _id: bookId, reservedCopies: { $gt: 0 } },
    { $inc: { reservedCopies: -1 } }
  );

  return reservation;
};

module.exports = {
  placeReservation,
  cancelReservation
};
