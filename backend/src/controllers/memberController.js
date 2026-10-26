const User = require('../models/User');
const Loan = require('../models/Loan');
const Fine = require('../models/Fine');
const Reservation = require('../models/Reservation');
const AuditLog = require('../models/AuditLog');

// @desc    Get members list with search and filter
// @route   GET /api/members
// @access  Private (Admin, Librarian)
const getMembers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const query = { role: 'member' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { memberId: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [members, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      members,
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

// @desc    Get member profile details with loan & fine summary
// @route   GET /api/members/:id
// @access  Private (Admin, Librarian, or Self)
const getMemberById = async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const [activeLoansCount, outstandingFines] = await Promise.all([
      Loan.countDocuments({ memberId: member._id, status: 'active' }),
      Fine.aggregate([
        { $match: { memberId: member._id, status: 'outstanding' } },
        { $group: { _id: null, totalBalance: { $sum: '$balance' } } }
      ])
    ]);

    const totalFinesDue = outstandingFines.length > 0 ? outstandingFines[0].totalBalance : 0;

    res.status(200).json({
      success: true,
      member,
      summary: {
        activeLoansCount,
        borrowingLimit: member.borrowingLimit,
        availableSlots: Math.max(0, member.borrowingLimit - activeLoansCount),
        totalFinesDue
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a member directly by staff
// @route   POST /api/members
// @access  Private (Admin, Librarian)
const createMember = async (req, res, next) => {
  try {
    const { name, email, password = 'Password@123', phone, address, borrowingLimit = 5 } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const member = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone,
      address,
      borrowingLimit: Math.max(1, parseInt(borrowingLimit, 10) || 5),
      role: 'member',
      status: 'active'
    });

    await AuditLog.create({
      action: 'MEMBER_CREATED_BY_STAFF',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'User',
      targetId: member._id.toString(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      member
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend member account
// @route   PATCH /api/members/:id/suspend
// @access  Private (Admin, Librarian)
const suspendMember = async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (member.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be suspended through member management.'
      });
    }

    member.status = 'suspended';
    await member.save();

    await AuditLog.create({
      action: 'MEMBER_SUSPENDED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'User',
      targetId: member._id.toString(),
      details: { reason: req.body.reason || 'Administrative action' },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Member '${member.name}' suspended successfully`,
      member
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivate member account
// @route   PATCH /api/members/:id/reactivate
// @access  Private (Admin, Librarian)
const reactivateMember = async (req, res, next) => {
  try {
    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.status = 'active';
    await member.save();

    await AuditLog.create({
      action: 'MEMBER_REACTIVATED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'User',
      targetId: member._id.toString(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Member '${member.name}' reactivated successfully`,
      member
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get member loan history
// @route   GET /api/members/:id/loans
// @access  Private (Admin, Librarian, or Self)
const getMemberLoans = async (req, res, next) => {
  try {
    const loans = await Loan.find({ memberId: req.params.id })
      .populate('bookId', 'title author isbn coverImage')
      .populate('copyId', 'barcode copyNumber condition')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      loans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get member reservations
// @route   GET /api/members/:id/reservations
// @access  Private (Admin, Librarian, or Self)
const getMemberReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ memberId: req.params.id })
      .populate('bookId', 'title author isbn availableCopies')
      .sort({ reservationDate: -1 });

    res.status(200).json({
      success: true,
      reservations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMembers,
  getMemberById,
  createMember,
  suspendMember,
  reactivateMember,
  getMemberLoans,
  getMemberReservations
};
