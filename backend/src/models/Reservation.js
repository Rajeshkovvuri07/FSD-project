const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    queuePosition: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'fulfilled', 'cancelled', 'expired'],
        message: 'Status must be pending, fulfilled, cancelled, or expired'
      },
      default: 'pending'
    },
    reservationDate: {
      type: Date,
      default: Date.now
    },
    expirationDate: {
      type: Date
    },
    allocatedCopyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookCopy'
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({ bookId: 1, status: 1, queuePosition: 1 });
reservationSchema.index({ memberId: 1, status: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
