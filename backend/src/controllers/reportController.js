const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');

/**
 * Sanitize cell content against CSV/Spreadsheet Formula Injection (CWE-1236)
 * If cell starts with '=', '+', '-', '@', prefix with a single quote "'"
 */
const sanitizeCSVCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

// @desc    Export loans circulation report as CSV with CSV injection prevention
// @route   GET /api/reports/circulation/csv
// @access  Private (Admin, Librarian)
const exportCirculationCSV = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const loans = await Loan.find(query)
      .populate('bookId', 'title isbn category author')
      .populate('copyId', 'barcode')
      .populate('memberId', 'name email memberId')
      .sort({ createdAt: -1 });

    const headers = ['Loan ID', 'Book Title', 'ISBN', 'Copy Barcode', 'Member Name', 'Member Email', 'Issue Date', 'Due Date', 'Return Date', 'Status', 'Fine Amount'];

    const rows = loans.map((loan) => [
      sanitizeCSVCell(loan.loanId),
      sanitizeCSVCell(loan.bookId ? loan.bookId.title : 'N/A'),
      sanitizeCSVCell(loan.bookId ? loan.bookId.isbn : 'N/A'),
      sanitizeCSVCell(loan.copyId ? loan.copyId.barcode : 'N/A'),
      sanitizeCSVCell(loan.memberId ? loan.memberId.name : 'N/A'),
      sanitizeCSVCell(loan.memberId ? loan.memberId.email : 'N/A'),
      sanitizeCSVCell(loan.issueDate ? new Date(loan.issueDate).toISOString().split('T')[0] : ''),
      sanitizeCSVCell(loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : ''),
      sanitizeCSVCell(loan.returnDate ? new Date(loan.returnDate).toISOString().split('T')[0] : 'Not Returned'),
      sanitizeCSVCell(loan.status),
      sanitizeCSVCell(`$${(loan.fineAmount || 0).toFixed(2)}`)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=circulation-report-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Export inventory report as CSV
// @route   GET /api/reports/inventory/csv
// @access  Private (Admin, Librarian)
const exportInventoryCSV = async (req, res, next) => {
  try {
    const books = await Book.find().sort({ title: 1 });

    const headers = ['Title', 'Author', 'ISBN', 'Publisher', 'Category', 'Published Year', 'Total Copies', 'Available Copies', 'Borrowed Copies', 'Reserved Copies', 'Status'];

    const rows = books.map((b) => [
      sanitizeCSVCell(b.title),
      sanitizeCSVCell(b.author),
      sanitizeCSVCell(b.isbn),
      sanitizeCSVCell(b.publisher),
      sanitizeCSVCell(b.category),
      sanitizeCSVCell(b.publishedYear || 'N/A'),
      sanitizeCSVCell(b.totalCopies),
      sanitizeCSVCell(b.availableCopies),
      sanitizeCSVCell(b.borrowedCopies),
      sanitizeCSVCell(b.reservedCopies),
      sanitizeCSVCell(b.status)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportCirculationCSV,
  exportInventoryCSV
};
