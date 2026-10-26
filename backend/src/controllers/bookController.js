const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const Loan = require('../models/Loan');
const AuditLog = require('../models/AuditLog');
const { syncBookInventoryCounts } = require('../services/inventoryService');

// @desc    Create new book with optional initial copies
// @route   POST /api/books
// @access  Private (Admin, Librarian)
const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      publisher,
      category,
      publishedYear,
      description,
      coverImage,
      initialCopies = 1
    } = req.body;

    if (!title || !author || !isbn || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, ISBN, and category are required'
      });
    }

    const cleanISBN = isbn.trim().toUpperCase();
    const existing = await Book.findOne({ isbn: cleanISBN });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Book with ISBN '${cleanISBN}' already exists in the catalog.`
      });
    }

    const numCopies = Math.max(0, parseInt(initialCopies, 10) || 0);

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: cleanISBN,
      publisher: publisher ? publisher.trim() : 'Unknown Publisher',
      category: category.trim(),
      publishedYear: publishedYear ? parseInt(publishedYear, 10) : undefined,
      description: description ? description.trim() : '',
      coverImage: coverImage || '',
      totalCopies: numCopies,
      availableCopies: numCopies,
      borrowedCopies: 0,
      reservedCopies: 0,
      status: 'active'
    });

    // Generate physical copies
    if (numCopies > 0) {
      const copies = [];
      for (let i = 1; i <= numCopies; i++) {
        copies.push({
          bookId: book._id,
          copyNumber: i,
          barcode: `BC-${cleanISBN}-${i.toString().padStart(3, '0')}`,
          status: 'available',
          condition: 'new'
        });
      }
      await BookCopy.insertMany(copies);
    }

    await AuditLog.create({
      action: 'BOOK_CREATED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Book',
      targetId: book._id.toString(),
      details: { title: book.title, isbn: book.isbn, copiesAdded: numCopies },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      book
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all books with search, filter, and pagination
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res, next) => {
  try {
    const {
      search,
      category,
      availableOnly,
      status = 'active',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter status (active by default, admin/librarian can query archived)
    if (status !== 'all') {
      query.status = status;
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Availability filter
    if (availableOnly === 'true' || availableOnly === true) {
      query.availableCopies = { $gt: 0 };
    }

    // Safe regex search across title, author, isbn, publisher, category
    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: cleanSearch, $options: 'i' } },
        { author: { $regex: cleanSearch, $options: 'i' } },
        { isbn: { $regex: cleanSearch, $options: 'i' } },
        { publisher: { $regex: cleanSearch, $options: 'i' } },
        { category: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = ['title', 'author', 'publishedYear', 'createdAt', 'availableCopies', 'totalCopies'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [books, total] = await Promise.all([
      Book.find(query)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum),
      Book.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      books,
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

// @desc    Get single book details and copies
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const copies = await BookCopy.find({ bookId: book._id }).sort({ copyNumber: 1 });

    res.status(200).json({
      success: true,
      book,
      copies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update book metadata
// @route   PUT /api/books/:id
// @access  Private (Admin, Librarian)
const updateBook = async (req, res, next) => {
  try {
    const { title, author, publisher, category, publishedYear, description, coverImage } = req.body;

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (publisher !== undefined) book.publisher = publisher.trim();
    if (category) book.category = category.trim();
    if (publishedYear !== undefined) book.publishedYear = parseInt(publishedYear, 10);
    if (description !== undefined) book.description = description.trim();
    if (coverImage !== undefined) book.coverImage = coverImage;

    await book.save();

    await AuditLog.create({
      action: 'BOOK_UPDATED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Book',
      targetId: book._id.toString(),
      details: { title: book.title },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive book safely (protects active loans)
// @route   PATCH /api/books/:id/archive
// @access  Private (Admin)
const archiveBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check for active loans
    const activeLoan = await Loan.findOne({
      bookId: book._id,
      status: 'active'
    });

    if (activeLoan) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive this book: There are active loans currently out for its copies.'
      });
    }

    book.status = book.status === 'archived' ? 'active' : 'archived';
    await book.save();

    await AuditLog.create({
      action: book.status === 'archived' ? 'BOOK_ARCHIVED' : 'BOOK_UNARCHIVED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Book',
      targetId: book._id.toString(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Book ${book.status === 'archived' ? 'archived' : 'restored'} successfully`,
      book
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add physical copies to a book
// @route   POST /api/books/:id/copies
// @access  Private (Admin, Librarian)
const addBookCopies = async (req, res, next) => {
  try {
    const { count = 1, condition = 'good' } = req.body;
    const addCount = Math.max(1, parseInt(count, 10) || 1);

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Find highest copy number existing
    const lastCopy = await BookCopy.findOne({ bookId: book._id }).sort({ copyNumber: -1 });
    const startNum = lastCopy ? lastCopy.copyNumber + 1 : 1;

    const newCopies = [];
    for (let i = 0; i < addCount; i++) {
      const copyNum = startNum + i;
      newCopies.push({
        bookId: book._id,
        copyNumber: copyNum,
        barcode: `BC-${book.isbn}-${copyNum.toString().padStart(3, '0')}`,
        status: 'available',
        condition
      });
    }

    await BookCopy.insertMany(newCopies);
    const updatedBook = await syncBookInventoryCounts(book._id);

    await AuditLog.create({
      action: 'BOOK_COPIES_ADDED',
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      targetType: 'Book',
      targetId: book._id.toString(),
      details: { countAdded: addCount, newTotal: updatedBook.totalCopies },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `${addCount} copies added successfully`,
      book: updatedBook,
      addedCopies: newCopies
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  archiveBook,
  addBookCopies
};
