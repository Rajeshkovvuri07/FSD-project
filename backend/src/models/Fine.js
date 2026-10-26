const mongoose = require('mongoose');

const paymentSubSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero']
    },
    date: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['cash', 'card_terminal', 'library_credit'],
      default: 'cash'
    },
    receiptNumber: {
      type: String,
      required: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { _id: true }
);

const fineSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: [true, 'Loan reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    balance: {
      type: Number,
      required: true,
      min: 0
    },
    overdueDays: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['outstanding', 'paid', 'waived'],
      default: 'outstanding'
    },
    policyApplied: {
      type: String,
      default: 'Standard Daily Fine Policy'
    },
    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    waiveReason: {
      type: String
    },
    payments: [paymentSubSchema]
  },
  {
    timestamps: true
  }
);

fineSchema.index({ memberId: 1, status: 1 });
fineSchema.index({ loanId: 1 });

const Fine = mongoose.model('Fine', fineSchema);

module.exports = Fine;
