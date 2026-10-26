const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters']
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [200, 'Author cannot exceed 200 characters']
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^(?:\d{9}[\dX]|\d{13})$/, 'ISBN must be a valid 10 or 13 digit number']
    },
    publisher: {
      type: String,
      trim: true,
      default: 'Unknown Publisher'
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    publishedYear: {
      type: Number,
      min: [1000, 'Invalid published year'],
      max: [new Date().getFullYear() + 1, 'Published year cannot be in the distant future']
    },
    totalCopies: {
      type: Number,
      default: 0,
      min: [0, 'Total copies cannot be negative']
    },
    availableCopies: {
      type: Number,
      default: 0,
      min: [0, 'Available copies cannot be negative']
    },
    borrowedCopies: {
      type: Number,
      default: 0,
      min: [0, 'Borrowed copies cannot be negative']
    },
    reservedCopies: {
      type: Number,
      default: 0,
      min: [0, 'Reserved copies cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    coverImage: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimized querying
bookSchema.index({ status: 1, category: 1 });
bookSchema.index({ title: 'text', author: 'text', publisher: 'text', category: 'text' });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
