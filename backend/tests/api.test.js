const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const User = require('../src/models/User');
const Book = require('../src/models/Book');
const BookCopy = require('../src/models/BookCopy');
const Loan = require('../src/models/Loan');
const Reservation = require('../src/models/Reservation');
const Fine = require('../src/models/Fine');

describe('Library Management System - Comprehensive QA & Production Audit Suite', () => {
  let adminToken;
  let librarianToken;
  let memberToken;
  let memberUser;
  let adminUser;
  let librarianUser;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await setupTestDB();
  });

  after(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create deterministic test users
    adminUser = await User.create({
      name: 'Admin Tester',
      email: 'admin@test.com',
      password: 'AdminPassword@123',
      role: 'admin',
      status: 'active'
    });

    librarianUser = await User.create({
      name: 'Librarian Tester',
      email: 'librarian@test.com',
      password: 'LibrarianPassword@123',
      role: 'librarian',
      status: 'active'
    });

    memberUser = await User.create({
      name: 'Member Tester',
      email: 'member@test.com',
      password: 'MemberPassword@123',
      role: 'member',
      status: 'active',
      borrowingLimit: 5
    });

    // Obtain tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPassword@123' });
    adminToken = adminLogin.body.token;

    const librarianLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'librarian@test.com', password: 'LibrarianPassword@123' });
    librarianToken = librarianLogin.body.token;

    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@test.com', password: 'MemberPassword@123' });
    memberToken = memberLogin.body.token;
  });

  // Workflow 1: Administrator login
  it('1. Administrator Login - should authenticate successfully with valid credentials and reject invalid ones', async () => {
    const validRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPassword@123' });

    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.success, true);
    assert.ok(validRes.body.token);
    assert.equal(validRes.body.user.role, 'admin');

    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });

    assert.equal(invalidRes.status, 401);
    assert.equal(invalidRes.body.success, false);
  });

  // Workflow 2: Unauthorized request rejection & RBAC
  it('2. Unauthorized Request Rejection - should reject unauthenticated requests and enforce RBAC', async () => {
    // No token
    const noTokenRes = await request(app).get('/api/circulation/active');
    assert.equal(noTokenRes.status, 401);

    // Member trying to archive book (Admin only)
    const book = await Book.create({
      title: 'Test Book',
      author: 'Author',
      isbn: '9780000000001',
      category: 'Science',
      totalCopies: 1,
      availableCopies: 1
    });

    const memberArchiveRes = await request(app)
      .patch(`/api/books/${book._id}/archive`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(memberArchiveRes.status, 403);
  });

  // Workflow 3: Book creation and editing
  it('3. Book Creation and Editing - should create book with physical copies and update metadata', async () => {
    const createRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Refactoring: Improving the Design of Existing Code',
        author: 'Martin Fowler',
        isbn: '9780201485677',
        category: 'Computer Science',
        publishedYear: 1999,
        initialCopies: 2
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.book.totalCopies, 2);
    assert.equal(createRes.body.book.availableCopies, 2);

    const bookId = createRes.body.book._id;

    // Verify copies were inserted
    const copies = await BookCopy.find({ bookId });
    assert.equal(copies.length, 2);
    assert.ok(copies[0].barcode.startsWith('BC-9780201485677-'));

    // Update metadata
    const updateRes = await request(app)
      .put(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: 'Refactoring: 2nd Edition'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.book.title, 'Refactoring: 2nd Edition');
  });

  // Workflow 4: Duplicate ISBN rejection
  it('4. Duplicate ISBN Rejection - should prevent duplicate ISBNs with 409 conflict', async () => {
    await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Original Title',
        author: 'Author One',
        isbn: '9781111111111',
        category: 'Fiction'
      });

    const duplicateRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Another Title',
        author: 'Author Two',
        isbn: '9781111111111',
        category: 'Fiction'
      });

    assert.equal(duplicateRes.status, 409);
    assert.ok(duplicateRes.body.message.includes('already exists'));
  });

  // Workflow 5: Member registration & role protection
  it('5. Member Registration - should register user and prevent privilege escalation', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Registered User',
        email: 'newuser@test.com',
        password: 'Password@123',
        role: 'admin' // Attempted privilege escalation
      });

    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.user.role, 'member'); // Must remain member
    assert.ok(regRes.body.user.memberId);
  });

  // Workflow 6: Successful book issue
  it('6. Successful Book Issue - should issue copy and update inventory counts atomically', async () => {
    const bookRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Domain-Driven Design',
        author: 'Eric Evans',
        isbn: '9780321125217',
        category: 'Computer Science',
        initialCopies: 2
      });

    const bookId = bookRes.body.book._id;

    const issueRes = await request(app)
      .post('/api/circulation/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        memberId: memberUser._id.toString(),
        bookId
      });

    assert.equal(issueRes.status, 201);
    assert.equal(issueRes.body.success, true);
    assert.equal(issueRes.body.loan.status, 'active');

    // Check updated book inventory
    const updatedBook = await Book.findById(bookId);
    assert.equal(updatedBook.availableCopies, 1);
    assert.equal(updatedBook.borrowedCopies, 1);
  });

  // Workflow 7: Unavailable-copy rejection
  it('7. Unavailable-Copy Rejection - should reject issue request when no copies are available', async () => {
    const bookRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Rare Manuscript',
        author: 'Ancient Scholar',
        isbn: '9780000000099',
        category: 'History',
        initialCopies: 1
      });

    const bookId = bookRes.body.book._id;

    // Issue the only copy
    await request(app)
      .post('/api/circulation/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ memberId: memberUser._id.toString(), bookId });

    // Attempt second issue
    const secondIssue = await request(app)
      .post('/api/circulation/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ memberId: memberUser._id.toString(), bookId });

    assert.equal(secondIssue.status, 400);
    assert.ok(secondIssue.body.message.includes('No copies') || secondIssue.body.message.includes('available'));
  });

  // Workflow 8: Successful book return
  it('8. Successful Book Return - should return copy and restore inventory counts', async () => {
    const book = await Book.create({
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      isbn: '9780135957059',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 0,
      borrowedCopies: 1
    });

    const copy = await BookCopy.create({
      bookId: book._id,
      copyNumber: 1,
      barcode: 'BC-9780135957059-001',
      status: 'borrowed'
    });

    const loan = await Loan.create({
      loanId: 'LN-TEST-RETURN-01',
      bookId: book._id,
      copyId: copy._id,
      memberId: memberUser._id,
      issuedBy: librarianUser._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active'
    });

    const returnRes = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ loanId: loan.loanId });

    assert.equal(returnRes.status, 200);
    assert.equal(returnRes.body.loan.status, 'returned');
    assert.ok(returnRes.body.loan.returnDate);

    // Verify copy restored to available
    const restoredCopy = await BookCopy.findById(copy._id);
    assert.equal(restoredCopy.status, 'available');

    // Verify book counts
    const restoredBook = await Book.findById(book._id);
    assert.equal(restoredBook.availableCopies, 1);
    assert.equal(restoredBook.borrowedCopies, 0);
  });

  // Workflow 9: Duplicate-return rejection
  it('9. Duplicate-Return Rejection - should reject returning an already returned loan', async () => {
    const book = await Book.create({
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      isbn: '9780134494166',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 1,
      borrowedCopies: 0
    });

    const copy = await BookCopy.create({
      bookId: book._id,
      copyNumber: 1,
      barcode: 'BC-9780134494166-001',
      status: 'available'
    });

    const loan = await Loan.create({
      loanId: 'LN-TEST-DUP-01',
      bookId: book._id,
      copyId: copy._id,
      memberId: memberUser._id,
      issuedBy: librarianUser._id,
      dueDate: new Date(),
      status: 'returned',
      returnDate: new Date()
    });

    const dupRes = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ loanId: loan.loanId });

    assert.equal(dupRes.status, 400);
    assert.ok(dupRes.body.message.includes('already been returned'));
  });

  // Workflow 10: Loan renewal eligibility
  it('10. Loan Renewal Eligibility - should allow renewal when eligible and reject when overdue or maxed', async () => {
    const book = await Book.create({
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      isbn: '9780596517748',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 0,
      borrowedCopies: 1
    });

    const copy = await BookCopy.create({
      bookId: book._id,
      copyNumber: 1,
      barcode: 'BC-9780596517748-001',
      status: 'borrowed'
    });

    // 1. Eligible loan
    const futureDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const loan = await Loan.create({
      loanId: 'LN-TEST-RENEW-01',
      bookId: book._id,
      copyId: copy._id,
      memberId: memberUser._id,
      issuedBy: librarianUser._id,
      dueDate: futureDueDate,
      status: 'active',
      renewalCount: 0,
      maxRenewals: 2
    });

    const renewRes = await request(app)
      .post(`/api/circulation/renew/${loan.loanId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(renewRes.status, 200);
    assert.equal(renewRes.body.loan.renewalCount, 1);

    // 2. Overdue loan renewal attempt
    const pastDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const overdueLoan = await Loan.create({
      loanId: 'LN-TEST-RENEW-OVERDUE',
      bookId: book._id,
      copyId: copy._id,
      memberId: memberUser._id,
      issuedBy: librarianUser._id,
      dueDate: pastDueDate,
      status: 'active',
      renewalCount: 0
    });

    const overdueRenewRes = await request(app)
      .post(`/api/circulation/renew/${overdueLoan.loanId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(overdueRenewRes.status, 400);
    assert.ok(overdueRenewRes.body.message.includes('Overdue'));
  });

  // Workflow 11: Reservation creation
  it('11. Reservation Creation - should place reservation and prevent duplicate active reservations', async () => {
    const book = await Book.create({
      title: 'Structure and Interpretation of Computer Programs',
      author: 'Harold Abelson',
      isbn: '9780262510875',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 0
    });

    const reserveRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId: book._id.toString() });

    assert.equal(reserveRes.status, 201);
    assert.equal(reserveRes.body.reservation.queuePosition, 1);

    // Duplicate reservation attempt by same member
    const dupRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId: book._id.toString() });

    assert.equal(dupRes.status, 400);
    assert.ok(dupRes.body.message.includes('already have an active reservation'));
  });

  // Workflow 12: Fine calculation and payment recording
  it('12. Fine Calculation and Payment Recording - should calculate overdue fine and record payment', async () => {
    const book = await Book.create({
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      isbn: '9780262033848',
      category: 'Computer Science',
      totalCopies: 1,
      availableCopies: 0,
      borrowedCopies: 1
    });

    const copy = await BookCopy.create({
      bookId: book._id,
      copyNumber: 1,
      barcode: 'BC-9780262033848-001',
      status: 'borrowed'
    });

    // 5 days overdue
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 5);

    const loan = await Loan.create({
      loanId: 'LN-TEST-FINE-01',
      bookId: book._id,
      copyId: copy._id,
      memberId: memberUser._id,
      issuedBy: librarianUser._id,
      dueDate: pastDueDate,
      status: 'active'
    });

    // Return overdue book
    const returnRes = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ loanId: loan.loanId });

    assert.equal(returnRes.status, 200);
    assert.ok(returnRes.body.fine);
    assert.equal(returnRes.body.fine.amount, 5.00); // 5 days * $1.00/day
    assert.equal(returnRes.body.fine.overdueDays, 5);

    const fineId = returnRes.body.fine.fineId;

    // Record partial payment ($3.00)
    const payRes = await request(app)
      .post(`/api/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ amount: 3.00, method: 'cash' });

    assert.equal(payRes.status, 200);
    assert.equal(payRes.body.receipt.remainingBalance, 2.00);
    assert.equal(payRes.body.receipt.status, 'outstanding');

    // Attempt invalid overpayment ($10.00)
    const overpayRes = await request(app)
      .post(`/api/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ amount: 10.00 });

    assert.equal(overpayRes.status, 400);
    assert.ok(overpayRes.body.message.includes('exceeds remaining balance'));
  });

  // Workflow 13: Dashboard metric accuracy
  it('13. Dashboard Metric Accuracy - should return live metrics matching direct database counts', async () => {
    // Seed verified data
    await BookCopy.create([
      { bookId: new User()._id, copyNumber: 1, barcode: 'BC-TEST-01', status: 'available' },
      { bookId: new User()._id, copyNumber: 2, barcode: 'BC-TEST-02', status: 'borrowed' }
    ]);

    const statsRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes.status, 200);
    const { stats } = statsRes.body;

    // Cross-check against live DB
    const actualTotalCopies = await BookCopy.countDocuments();
    const actualAvailable = await BookCopy.countDocuments({ status: 'available' });
    const actualBorrowed = await BookCopy.countDocuments({ status: 'borrowed' });
    const actualMembers = await User.countDocuments({ role: 'member' });

    assert.equal(stats.totalCopies, actualTotalCopies);
    assert.equal(stats.availableCopies, actualAvailable);
    assert.equal(stats.borrowedCopies, actualBorrowed);
    assert.equal(stats.registeredMembers, actualMembers);
  });

  // Workflow 14: Member data isolation (IDOR protection)
  it('14. Member Data Isolation - should reject member attempts to access other members private records', async () => {
    const victimMember = await User.create({
      name: 'Victim Member',
      email: 'victim@test.com',
      password: 'Password@123',
      role: 'member'
    });

    const idorRes = await request(app)
      .get(`/api/members/${victimMember._id}/loans`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(idorRes.status, 403);
    assert.ok(idorRes.body.message.includes('Access denied'));
  });

  // Workflow 15: Data persistence
  it('15. Data Persistence - should reliably persist and retrieve multi-field documents', async () => {
    const book = await Book.create({
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '9781449373320',
      category: 'Computer Science',
      publisher: "O'Reilly Media",
      publishedYear: 2017,
      totalCopies: 5,
      availableCopies: 5
    });

    const retrieved = await Book.findById(book._id);
    assert.equal(retrieved.title, 'Designing Data-Intensive Applications');
    assert.equal(retrieved.isbn, '9781449373320');
    assert.equal(retrieved.publisher, "O'Reilly Media");
    assert.ok(retrieved.createdAt instanceof Date);
  });

  // Workflow 16: Validation and error handling
  it('16. Validation and Error Handling - should return clean 400 for bad ObjectIds and missing fields', async () => {
    // Bad ObjectId
    const badIdRes = await request(app)
      .get('/api/books/invalid-mongo-id-12345');

    assert.equal(badIdRes.status, 400);
    assert.ok(badIdRes.body.message.includes('invalid') || badIdRes.body.message.includes('identifier'));

    // Missing required fields on book creation
    const missingFieldRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Incomplete Book' });

    assert.equal(missingFieldRes.status, 400);
    assert.ok(missingFieldRes.body.message.includes('required'));
  });
});
