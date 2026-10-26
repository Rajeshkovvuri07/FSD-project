const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const Loan = require('../models/Loan');
const Reservation = require('../models/Reservation');
const Fine = require('../models/Fine');
const AuditLog = require('../models/AuditLog');

const seedData = async (isStandalone = true) => {
  console.log('--- [DEMO SEED DATA GENERATOR] ---');
  console.log('Notice: This script loads standard demo seed records for evaluation and demonstration purposes.');

  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      BookCopy.deleteMany({}),
      Loan.deleteMany({}),
      Reservation.deleteMany({}),
      Fine.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('[Seed] Creating demo users...');
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@library.com',
      password: 'AdminPassword@123',
      role: 'admin',
      status: 'active',
      phone: '+1-555-0100'
    });

    const librarian = await User.create({
      name: 'Sarah Librarian',
      email: 'librarian@library.com',
      password: 'LibrarianPassword@123',
      role: 'librarian',
      status: 'active',
      phone: '+1-555-0101'
    });

    const member1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'MemberPassword@123',
      role: 'member',
      status: 'active',
      memberId: 'LIB-MEM-1001',
      phone: '+1-555-0102',
      address: '742 Evergreen Terrace',
      borrowingLimit: 5
    });

    const studentUser = await User.create({
      name: 'Student Demo User',
      email: 'student@library.com',
      password: 'StudentPassword@123',
      role: 'member',
      status: 'active',
      memberId: 'LIB-STU-1001',
      phone: '+1-555-0104',
      address: 'Campus Dorm Room 302',
      borrowingLimit: 5
    });

    const member2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'MemberPassword@123',
      role: 'member',
      status: 'active',
      memberId: 'LIB-MEM-1002',
      phone: '+1-555-0103',
      address: '221B Baker Street',
      borrowingLimit: 5
    });

    console.log('[Seed] Creating demo books & copies...');
    const demoBooks = [
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        publisher: 'Prentice Hall',
        category: 'Computer Science',
        publishedYear: 2008,
        description: 'A handbook of agile craftsmanship focusing on clean and maintainable code architecture.',
        copies: 3
      },
      {
        title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
        author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
        isbn: '9780201633610',
        publisher: 'Addison-Wesley',
        category: 'Computer Science',
        publishedYear: 1994,
        description: 'Classic book on software design patterns.',
        copies: 2
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780061120084',
        publisher: 'HarperCollins',
        category: 'Fiction',
        publishedYear: 1960,
        description: 'Pulitzer Prize-winning masterpiece of modern American literature.',
        copies: 4
      },
      {
        title: 'A Brief History of Time',
        author: 'Stephen Hawking',
        isbn: '9780553380163',
        publisher: 'Bantam Books',
        category: 'Science',
        publishedYear: 1988,
        description: 'From the Big Bang to Black Holes.',
        copies: 3
      },
      {
        title: 'Meditations',
        author: 'Marcus Aurelius',
        isbn: '9780140449334',
        publisher: 'Penguin Classics',
        category: 'Philosophy',
        publishedYear: 2006,
        description: 'Private philosophical reflections of the Roman Emperor Marcus Aurelius.',
        copies: 2
      }
    ];

    const createdBooks = [];
    const allCopies = [];

    for (const b of demoBooks) {
      const bookDoc = await Book.create({
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        publisher: b.publisher,
        category: b.category,
        publishedYear: b.publishedYear,
        description: b.description,
        totalCopies: b.copies,
        availableCopies: b.copies,
        borrowedCopies: 0,
        reservedCopies: 0,
        status: 'active'
      });

      for (let i = 1; i <= b.copies; i++) {
        const copyDoc = await BookCopy.create({
          bookId: bookDoc._id,
          copyNumber: i,
          barcode: `BC-${b.isbn}-${i.toString().padStart(3, '0')}`,
          status: 'available',
          condition: 'good'
        });
        allCopies.push(copyDoc);
      }
      createdBooks.push(bookDoc);
    }

    console.log('[Seed] Creating demo loan (active & overdue)...');
    // Issue one copy of Clean Code to Alice
    const cleanCodeCopy = allCopies.find((c) => c.bookId.toString() === createdBooks[0]._id.toString());
    cleanCodeCopy.status = 'borrowed';
    await cleanCodeCopy.save();

    await Book.findByIdAndUpdate(createdBooks[0]._id, {
      $inc: { availableCopies: -1, borrowedCopies: 1 }
    });

    const activeDueDate = new Date();
    activeDueDate.setDate(activeDueDate.getDate() + 10);

    await Loan.create({
      loanId: 'LN-DEMO-001',
      bookId: createdBooks[0]._id,
      copyId: cleanCodeCopy._id,
      memberId: member1._id,
      issuedBy: librarian._id,
      issueDate: new Date(),
      dueDate: activeDueDate,
      status: 'active',
      renewalCount: 0
    });

    // Create an overdue loan for Bob (Mockingbird)
    const mockingbirdCopy = allCopies.find((c) => c.bookId.toString() === createdBooks[2]._id.toString());
    mockingbirdCopy.status = 'borrowed';
    await mockingbirdCopy.save();

    await Book.findByIdAndUpdate(createdBooks[2]._id, {
      $inc: { availableCopies: -1, borrowedCopies: 1 }
    });

    const overdueIssueDate = new Date();
    overdueIssueDate.setDate(overdueIssueDate.getDate() - 20);
    const overdueDueDate = new Date();
    overdueDueDate.setDate(overdueDueDate.getDate() - 6);

    const overdueLoan = await Loan.create({
      loanId: 'LN-DEMO-002',
      bookId: createdBooks[2]._id,
      copyId: mockingbirdCopy._id,
      memberId: member2._id,
      issuedBy: librarian._id,
      issueDate: overdueIssueDate,
      dueDate: overdueDueDate,
      status: 'active',
      renewalCount: 0
    });

    console.log('[Seed] Creating demo reservation...');
    // Alice reserves Design Patterns
    await Reservation.create({
      bookId: createdBooks[1]._id,
      memberId: member1._id,
      queuePosition: 1,
      status: 'pending',
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await Book.findByIdAndUpdate(createdBooks[1]._id, { $inc: { reservedCopies: 1 } });

    console.log('[Seed] Demo data seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('  Administrator: admin@library.com     | Password: AdminPassword@123 (or Admin@123)');
    console.log('  Librarian:     librarian@library.com | Password: LibrarianPassword@123 (or Librarian@123)');
    console.log('  Student:       student@library.com   | Password: StudentPassword@123 (or Student@123)');
    console.log('  Member (Alice): alice@example.com    | Password: MemberPassword@123');
    console.log('----------------------------------------------------');

    if (isStandalone) {
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    if (isStandalone) {
      process.exit(1);
    }
    throw err;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
