const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const AuditLog = require('../models/AuditLog');
const { placeReservation, cancelReservation } = require('../services/reservationService');

// @desc    Place a reservation for a book
// @route   POST /api/reservations
// @access  Private (All authenticated users)
const createReservation = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required to create a reservation'
      });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (book.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reserve an archived book'
      });
    }

    const memberId = req.user.role === 'member' ? req.user._id : (req.body.memberId || req.user._id);

    const reservation = await placeReservation(book._id, memberId);

    await AuditLog.create({
      action: 'RESERVATION_CREATED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Reservation',
      targetId: reservation._id.toString(),
      details: { bookTitle: book.title, queuePosition: reservation.queuePosition },
      ipAddress: req.ip
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('bookId', 'title author isbn coverImage')
      .populate('memberId', 'name email');

    res.status(201).json({
      success: true,
      message: `Reservation placed successfully! You are #${reservation.queuePosition} in the waitlist.`,
      reservation: populated
    });
  } catch (error) {
    if (error.message.includes('already have an active reservation')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Cancel a reservation
// @route   PATCH /api/reservations/:id/cancel
// @access  Private
const cancelUserReservation = async (req, res, next) => {
  try {
    const isAdminOrLibrarian = req.user.role === 'admin' || req.user.role === 'librarian';
    const reservation = await cancelReservation(req.params.id, req.user._id, isAdminOrLibrarian);

    await AuditLog.create({
      action: 'RESERVATION_CANCELLED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Reservation',
      targetId: reservation._id.toString(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      reservation
    });
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Get reservations list
// @route   GET /api/reservations
// @access  Private
const getReservations = async (req, res, next) => {
  try {
    const { bookId, status = 'pending', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (bookId) {
      query.bookId = bookId;
    }

    // If regular member, strictly isolate to their own reservations
    if (req.user.role === 'member') {
      query.memberId = req.user._id;
    } else if (req.query.memberId) {
      query.memberId = req.query.memberId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reservations, total] = await Promise.all([
      Reservation.find(query)
        .populate('bookId', 'title author isbn coverImage availableCopies')
        .populate('memberId', 'name email memberId phone')
        .sort({ queuePosition: 1, reservationDate: 1 })
        .skip(skip)
        .limit(limitNum),
      Reservation.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      reservations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  cancelUserReservation,
  getReservations
};
