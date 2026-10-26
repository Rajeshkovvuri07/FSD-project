const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      unique: true,
      required: true
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required']
    },
    copyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookCopy',
      required: [true, 'BookCopy reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff reference is required']
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    returnDate: {
      type: Date
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'returned', 'overdue'],
        message: 'Status must be active, returned, or overdue'
      },
      default: 'active'
    },
    renewalCount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxRenewals: {
      type: Number,
      default: 2
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    finePaid: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

loanSchema.index({ memberId: 1, status: 1 });
loanSchema.index({ copyId: 1, status: 1 });
loanSchema.index({ dueDate: 1, status: 1 });

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;
