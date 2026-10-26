const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const config = require('./config/config');
const seedData = require('./seeds/seedData');

const runDevWithMemoryDB = async () => {
  console.log('[DevRunner] Starting in-memory MongoDB environment...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`[DevRunner] In-memory MongoDB active at ${uri}`);

  process.env.MONGODB_URI = uri;
  config.mongoUri = uri;

  // Run initial seed
  try {
    console.log('[DevRunner] Auto-seeding initial demo records...');
    // Connect and seed
    await mongoose.connect(uri);
    
    const User = require('./models/User');
    const Book = require('./models/Book');
    const BookCopy = require('./models/BookCopy');
    const Loan = require('./models/Loan');
    const Reservation = require('./models/Reservation');

    // Create demo users
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@library.com',
      password: 'AdminPassword@123',
      role: 'admin',
      status: 'active'
    });

    const librarian = await User.create({
      name: 'Sarah Librarian',
      email: 'librarian@library.com',
      password: 'LibrarianPassword@123',
      role: 'librarian',
      status: 'active'
    });

    const member1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'MemberPassword@123',
      role: 'member',
      status: 'active',
      memberId: 'LIB-MEM-1001'
    });

    const member2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'MemberPassword@123',
      role: 'member',
      status: 'active',
      memberId: 'LIB-MEM-1002'
    });

    // Create sample books
    const book1 = await Book.create({
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      publisher: 'Prentice Hall',
      category: 'Computer Science',
      publishedYear: 2008,
      totalCopies: 3,
      availableCopies: 2,
      borrowedCopies: 1,
      status: 'active'
    });

    const copies1 = await BookCopy.insertMany([
      { bookId: book1._id, copyNumber: 1, barcode: 'BC-9780132350884-001', status: 'borrowed' },
      { bookId: book1._id, copyNumber: 2, barcode: 'BC-9780132350884-002', status: 'available' },
      { bookId: book1._id, copyNumber: 3, barcode: 'BC-9780132350884-003', status: 'available' }
    ]);

    const book2 = await Book.create({
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      isbn: '9780201633610',
      publisher: 'Addison-Wesley',
      category: 'Computer Science',
      publishedYear: 1994,
      totalCopies: 2,
      availableCopies: 2,
      borrowedCopies: 0,
      status: 'active'
    });

    await BookCopy.insertMany([
      { bookId: book2._id, copyNumber: 1, barcode: 'BC-9780201633610-001', status: 'available' },
      { bookId: book2._id, copyNumber: 2, barcode: 'BC-9780201633610-002', status: 'available' }
    ]);

    // Active loan
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    await Loan.create({
      loanId: 'LN-DEV-001',
      bookId: book1._id,
      copyId: copies1[0]._id,
      memberId: member1._id,
      issuedBy: librarian._id,
      issueDate: new Date(),
      dueDate,
      status: 'active'
    });

    console.log('[DevRunner] Demo database ready with 4 users and 2 catalog titles.');
    
    // Start Express HTTP app
    const app = require('./app');
    const port = config.port || 5000;
    app.listen(port, () => {
      console.log(`[DevRunner] Server running at http://localhost:${port}`);
      console.log('Demo Credentials:');
      console.log('  Admin:     admin@library.com     | Password: AdminPassword@123');
      console.log('  Librarian: librarian@library.com | Password: LibrarianPassword@123');
      console.log('  Member 1:  alice@example.com     | Password: MemberPassword@123');
      console.log('  Member 2:  bob@example.com       | Password: MemberPassword@123');
    });
  } catch (err) {
    console.error('[DevRunner Error]', err);
  }
};

runDevWithMemoryDB();
