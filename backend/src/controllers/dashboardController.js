const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Reservation = require('../models/Reservation');
const Fine = require('../models/Fine');

// @desc    Get live real-time dashboard analytics
// @route   GET /api/dashboard/stats
// @access  Private (Admin, Librarian)
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalCopies,
      availableCopies,
      borrowedCopies,
      registeredMembers,
      overdueLoans,
      pendingReservations,
      finesSummary,
      recentLoans,
      mostBorrowedRaw
    ] = await Promise.all([
      BookCopy.countDocuments(),
      BookCopy.countDocuments({ status: 'available' }),
      BookCopy.countDocuments({ status: 'borrowed' }),
      User.countDocuments({ role: 'member' }),
      Loan.countDocuments({ status: 'active', dueDate: { $lt: now } }),
      Reservation.countDocuments({ status: 'pending' }),
      Fine.aggregate([
        { $match: { status: 'outstanding' } },
        { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
      ]),
      Loan.find()
        .populate('bookId', 'title author isbn coverImage')
        .populate('copyId', 'barcode')
        .populate('memberId', 'name email memberId')
        .sort({ createdAt: -1 })
        .limit(8),
      Loan.aggregate([
        { $group: { _id: '$bookId', borrowCount: { $sum: 1 } } },
        { $sort: { borrowCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Populate most borrowed books
    const bookIds = mostBorrowedRaw.map((item) => item._id);
    const books = await Book.find({ _id: { $in: bookIds } }).select('title author category coverImage');
    const mostBorrowedTitles = mostBorrowedRaw.map((item) => {
      const b = books.find((book) => book._id.toString() === item._id.toString());
      return {
        bookId: item._id,
        title: b ? b.title : 'Unknown Title',
        author: b ? b.author : 'Unknown Author',
        category: b ? b.category : 'General',
        borrowCount: item.borrowCount
      };
    });

    // Monthly trends (past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrends = await Loan.aggregate([
      { $match: { issueDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedTrends = monthlyTrends.map((t) => ({
      period: `${monthNames[t._id.month - 1]} ${t._id.year}`,
      loans: t.count
    }));

    const outstandingFines = finesSummary.length > 0 ? Math.round(finesSummary[0].totalBalance * 100) / 100 : 0.0;

    res.status(200).json({
      success: true,
      stats: {
        totalCopies,
        availableCopies,
        borrowedCopies,
        registeredMembers,
        overdueLoans,
        pendingReservations,
        outstandingFines
      },
      recentCirculation: recentLoans,
      mostBorrowedTitles,
      monthlyTrends: formattedTrends
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
