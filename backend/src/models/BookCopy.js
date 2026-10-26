const mongoose = require('mongoose');

const bookCopySchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required']
    },
    copyNumber: {
      type: Number,
      required: [true, 'Copy number is required']
    },
    barcode: {
      type: String,
      required: [true, 'Barcode is required'],
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'borrowed', 'reserved', 'maintenance', 'lost'],
        message: 'Status must be available, borrowed, reserved, maintenance, or lost'
      },
      default: 'available'
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'damaged'],
      default: 'good'
    }
  },
  {
    timestamps: true
  }
);

bookCopySchema.index({ bookId: 1, copyNumber: 1 }, { unique: true });
bookCopySchema.index({ status: 1 });

const BookCopy = mongoose.model('BookCopy', bookCopySchema);

module.exports = BookCopy;
