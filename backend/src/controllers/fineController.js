const Fine = require('../models/Fine');
const Loan = require('../models/Loan');
const AuditLog = require('../models/AuditLog');

// @desc    Get fines list with filter
// @route   GET /api/fines
// @access  Private (Admin, Librarian)
const getFines = async (req, res, next) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status !== 'all') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [fines, total] = await Promise.all([
      Fine.find(query)
        .populate('memberId', 'name email memberId phone')
        .populate({
          path: 'loanId',
          populate: { path: 'bookId', select: 'title isbn' }
        })
        .populate('payments.recordedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Fine.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      fines,
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

// @desc    Get fines for a specific member
// @route   GET /api/fines/member/:id
// @access  Private (Admin, Librarian, Member Self)
const getMemberFines = async (req, res, next) => {
  try {
    const fines = await Fine.find({ memberId: req.params.id })
      .populate({
        path: 'loanId',
        populate: { path: 'bookId', select: 'title isbn' }
      })
      .sort({ createdAt: -1 });

    const totalOutstanding = fines
      .filter((f) => f.status === 'outstanding')
      .reduce((sum, f) => sum + f.balance, 0);

    res.status(200).json({
      success: true,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      fines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record fine payment (Cash / Card Terminal / Library Credit)
// @route   POST /api/fines/:id/pay
// @access  Private (Admin, Librarian)
const recordPayment = async (req, res, next) => {
  try {
    const { amount, method = 'cash' } = req.body;
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number greater than 0'
      });
    }

    const fine = await Fine.findById(req.params.id).populate('memberId', 'name email');
    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine record not found'
      });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This fine has already been fully paid'
      });
    }

    if (fine.status === 'waived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot record payment for a waived fine'
      });
    }

    if (paymentAmount > fine.balance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining balance ($${fine.balance.toFixed(2)})`
      });
    }

    const receiptNumber = `RCP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    fine.paidAmount = Math.round((fine.paidAmount + paymentAmount) * 100) / 100;
    fine.balance = Math.round((fine.amount - fine.paidAmount) * 100) / 100;

    if (fine.balance <= 0) {
      fine.status = 'paid';
      fine.balance = 0;
    }

    fine.payments.push({
      amount: paymentAmount,
      date: new Date(),
      method,
      receiptNumber,
      recordedBy: req.user._id
    });

    await fine.save();

    // If fully paid, update loan finePaid flag
    if (fine.status === 'paid') {
      await Loan.findByIdAndUpdate(fine.loanId, { finePaid: true });
    }

    await AuditLog.create({
      action: 'FINE_PAYMENT_RECORDED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Fine',
      targetId: fine._id.toString(),
      details: {
        receiptNumber,
        amount: paymentAmount,
        method,
        remainingBalance: fine.balance,
        memberEmail: fine.memberId.email
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Payment of $${paymentAmount.toFixed(2)} recorded successfully`,
      receipt: {
        receiptNumber,
        paymentDate: new Date(),
        amount: paymentAmount,
        method,
        remainingBalance: fine.balance,
        status: fine.status
      },
      fine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Waive a fine with authorized justification
// @route   PATCH /api/fines/:id/waive
// @access  Private (Admin only)
const waiveFine = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A valid justification reason (at least 5 characters) is required to waive a fine'
      });
    }

    const fine = await Fine.findById(req.params.id);
    if (!fine) {
      return res.status(404).json({
        success: false,
        message: 'Fine record not found'
      });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot waive an already paid fine'
      });
    }

    fine.status = 'waived';
    fine.waivedBy = req.user._id;
    fine.waiveReason = reason.trim();
    fine.balance = 0;
    await fine.save();

    await Loan.findByIdAndUpdate(fine.loanId, { finePaid: true });

    await AuditLog.create({
      action: 'FINE_WAIVED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Fine',
      targetId: fine._id.toString(),
      details: { reason, amountWaived: fine.amount - fine.paidAmount },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Fine waived successfully',
      fine
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFines,
  getMemberFines,
  recordPayment,
  waiveFine
};
