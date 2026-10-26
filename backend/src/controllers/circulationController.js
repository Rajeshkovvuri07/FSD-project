const Loan = require('../models/Loan');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const User = require('../models/User');
const Fine = require('../models/Fine');
const Reservation = require('../models/Reservation');
const AuditLog = require('../models/AuditLog');
const config = require('../config/config');
const { allocateAvailableCopy, returnBorrowedCopy } = require('../services/inventoryService');
const { calculateLoanFine } = require('../services/fineCalculator');

// @desc    Issue a book copy to a member
// @route   POST /api/circulation/issue
// @access  Private (Admin, Librarian)
const issueBook = async (req, res, next) => {
  try {
    const { memberId, bookId, barcode } = req.body;

    if (!memberId || (!bookId && !barcode)) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and either Book ID or Copy Barcode are required'
      });
    }

    // 1. Validate Member
    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (member.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Cannot issue book: Member account is suspended.'
      });
    }

    if (member.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Cannot issue book: Member account is deactivated.'
      });
    }

    // 2. Enforce Borrowing Limits
    const activeLoansCount = await Loan.countDocuments({
      memberId: member._id,
      status: 'active'
    });

    if (activeLoansCount >= member.borrowingLimit) {
      return res.status(400).json({
        success: false,
        message: `Member borrowing limit reached (${activeLoansCount}/${member.borrowingLimit} active loans). Please return existing books first.`
      });
    }

    // 3. Check for heavy outstanding fines (> $20 block)
    const unpaidFines = await Fine.aggregate([
      { $match: { memberId: member._id, status: 'outstanding' } },
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
    ]);
    const totalUnpaid = unpaidFines.length > 0 ? unpaidFines[0].totalBalance : 0;
    if (totalUnpaid > 20.00) {
      return res.status(400).json({
        success: false,
        message: `Member has $${totalUnpaid.toFixed(2)} in unpaid fines. Outstanding fines must be paid before borrowing new books.`
      });
    }

    // 4. Resolve Book and Copy
    let targetBookId = bookId;
    let preferredBarcode = barcode;

    if (barcode && !bookId) {
      const copy = await BookCopy.findOne({ barcode });
      if (!copy) {
        return res.status(404).json({
          success: false,
          message: `Book copy with barcode '${barcode}' not found`
        });
      }
      targetBookId = copy.bookId;
    }

    const book = await Book.findById(targetBookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (book.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot issue archived book'
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies of this book are currently available for issue.'
      });
    }

    // 5. Concurrency-Safe Allocation
    let allocated;
    try {
      allocated = await allocateAvailableCopy(book._id, preferredBarcode);
    } catch (allocErr) {
      return res.status(400).json({
        success: false,
        message: allocErr.message
      });
    }

    // 6. Calculate Due Date (now + borrowPeriodDays)
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + config.borrowPeriodDays);

    const loanId = `LN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const loan = await Loan.create({
      loanId,
      bookId: book._id,
      copyId: allocated.copy._id,
      memberId: member._id,
      issuedBy: req.user._id,
      issueDate,
      dueDate,
      status: 'active',
      renewalCount: 0,
      maxRenewals: config.maxRenewals
    });

    // 7. Fulfill top pending reservation if this member reserved it
    const topReservation = await Reservation.findOne({
      bookId: book._id,
      memberId: member._id,
      status: 'pending'
    });
    if (topReservation) {
      topReservation.status = 'fulfilled';
      topReservation.allocatedCopyId = allocated.copy._id;
      await topReservation.save();
    }

    await AuditLog.create({
      action: 'BOOK_ISSUED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Loan',
      targetId: loan._id.toString(),
      details: {
        loanId: loan.loanId,
        bookTitle: book.title,
        copyBarcode: allocated.copy.barcode,
        memberEmail: member.email,
        dueDate: loan.dueDate
      },
      ipAddress: req.ip
    });

    const populatedLoan = await Loan.findById(loan._id)
      .populate('bookId', 'title author isbn coverImage')
      .populate('copyId', 'barcode copyNumber condition')
      .populate('memberId', 'name email memberId');

    res.status(201).json({
      success: true,
      message: `Book '${book.title}' successfully issued to ${member.name}`,
      loan: populatedLoan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return a borrowed book copy
// @route   POST /api/circulation/return
// @access  Private (Admin, Librarian)
const returnBook = async (req, res, next) => {
  try {
    const { loanId, barcode, copyId } = req.body;

    if (!loanId && !barcode && !copyId) {
      return res.status(400).json({
        success: false,
        message: 'Loan ID, Copy Barcode, or Copy ID is required to process return'
      });
    }

    let query = {};
    if (loanId) {
      query.loanId = loanId;
    } else if (copyId) {
      query.copyId = copyId;
      query.status = 'active';
    } else if (barcode) {
      const copy = await BookCopy.findOne({ barcode });
      if (!copy) {
        return res.status(404).json({
          success: false,
          message: `Copy with barcode '${barcode}' not found`
        });
      }
      query.copyId = copy._id;
      query.status = 'active';
    }

    const loan = await Loan.findOne(query)
      .populate('bookId', 'title author isbn')
      .populate('copyId', 'barcode copyNumber')
      .populate('memberId', 'name email');

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'No matching active loan record found'
      });
    }

    // Reject duplicate returns
    if (loan.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate return rejected: This book copy has already been returned.'
      });
    }

    // 1. Restore copy to inventory
    await returnBorrowedCopy(loan.copyId._id);

    // 2. Fine calculation
    const returnDate = new Date();
    const { overdueDays, fineAmount, isOverdue } = calculateLoanFine(loan.dueDate, returnDate);

    let fineRecord = null;
    if (isOverdue && fineAmount > 0) {
      fineRecord = await Fine.create({
        loanId: loan._id,
        memberId: loan.memberId._id,
        amount: fineAmount,
        paidAmount: 0,
        balance: fineAmount,
        overdueDays,
        status: 'outstanding',
        policyApplied: `Late Return Fine ($${config.fineRatePerDay}/day for ${overdueDays} days, capped at $${config.maxFineAmount})`
      });
    }

    // 3. Mark Loan returned
    loan.status = 'returned';
    loan.returnDate = returnDate;
    loan.fineAmount = fineAmount;
    loan.finePaid = fineAmount === 0;
    await loan.save();

    await AuditLog.create({
      action: 'BOOK_RETURNED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Loan',
      targetId: loan._id.toString(),
      details: {
        loanId: loan.loanId,
        bookTitle: loan.bookId.title,
        copyBarcode: loan.copyId.barcode,
        overdueDays,
        fineAmount
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Book '${loan.bookId.title}' returned successfully`,
      loan,
      fine: fineRecord ? {
        fineId: fineRecord._id,
        amount: fineAmount,
        overdueDays,
        status: fineRecord.status
      } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Renew an eligible loan
// @route   POST /api/circulation/renew/:loanId
// @access  Private (Admin, Librarian, Member Self)
const renewLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ loanId: req.params.loanId })
      .populate('bookId', 'title')
      .populate('copyId', 'barcode');

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan record not found'
      });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Cannot renew a loan that has already been returned'
      });
    }

    // Member isolation check
    if (req.user.role === 'member' && loan.memberId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only renew your own loans'
      });
    }

    // Check if loan is already overdue
    const now = new Date();
    if (loan.dueDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Renewal policy violation: Overdue loans cannot be renewed. Please return the book and settle any fines.'
      });
    }

    // Check max renewals
    if (loan.renewalCount >= loan.maxRenewals) {
      return res.status(400).json({
        success: false,
        message: `Maximum renewal limit reached (${loan.renewalCount}/${loan.maxRenewals}). Book must be returned.`
      });
    }

    // Check if book has pending reservations
    const pendingReservation = await Reservation.findOne({
      bookId: loan.bookId._id,
      status: 'pending'
    });

    if (pendingReservation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot renew: Other members have placed reservations on this title.'
      });
    }

    // Extend due date
    const extendedDueDate = new Date(loan.dueDate);
    extendedDueDate.setDate(extendedDueDate.getDate() + config.borrowPeriodDays);

    loan.dueDate = extendedDueDate;
    loan.renewalCount += 1;
    await loan.save();

    await AuditLog.create({
      action: 'LOAN_RENEWED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Loan',
      targetId: loan._id.toString(),
      details: {
        loanId: loan.loanId,
        newDueDate: loan.dueDate,
        renewalCount: loan.renewalCount
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Loan renewed successfully until ${loan.dueDate.toLocaleDateString()}`,
      loan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active loans
// @route   GET /api/circulation/active
// @access  Private (Admin, Librarian)
const getActiveLoans = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      Loan.find({ status: 'active' })
        .populate('bookId', 'title author isbn coverImage')
        .populate('copyId', 'barcode copyNumber condition')
        .populate('memberId', 'name email memberId phone')
        .populate('issuedBy', 'name')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limitNum),
      Loan.countDocuments({ status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      loans,
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

// @desc    Get overdue loans
// @route   GET /api/circulation/overdue
// @access  Private (Admin, Librarian)
const getOverdueLoans = async (req, res, next) => {
  try {
    const now = new Date();
    const loans = await Loan.find({
      status: 'active',
      dueDate: { $lt: now }
    })
      .populate('bookId', 'title author isbn')
      .populate('copyId', 'barcode copyNumber')
      .populate('memberId', 'name email memberId phone')
      .sort({ dueDate: 1 });

    const enriched = loans.map((l) => {
      const fineDetails = calculateLoanFine(l.dueDate, now);
      return {
        ...l.toObject(),
        overdueDays: fineDetails.overdueDays,
        currentFineAccrued: fineDetails.fineAmount
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      loans: enriched
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  issueBook,
  returnBook,
  renewLoan,
  getActiveLoans,
  getOverdueLoans
};
