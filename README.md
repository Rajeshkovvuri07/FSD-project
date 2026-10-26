# Athena - Enterprise Library Book Management System (MERN)

A production-ready, full-stack Library Book Management and Circulation System built with MongoDB, Express.js, React.js, and Node.js.

---

## Architecture Overview

- **Backend**: Node.js & Express.js REST API with modular MVC architecture.
  - **Database & ODM**: MongoDB with Mongoose schemas, compound unique indexes, and atomic `$inc` inventory updates.
  - **Security**: JWT authentication, bcrypt password hashing, RBAC, Helmet security headers, rate limiting, and NoSQL injection sanitization.
  - **Circulation Engine**: Automated due-date policy, calendar-day fine calculation, renewal validation, and waitlist queue management.
  - **Reporting**: Exportable audit-compliant CSV reports with automatic spreadsheet formula injection protection (CWE-1236).
- **Frontend**: Modern Single-Page Application built with React 18, Vite, React Router v6, Lucide React icons, and Tailwind CSS.
  - **Responsive & Accessible**: Desktop, tablet, and mobile navigation drawer, ARIA modal dialogs with keyboard trapping, error banners, and loading skeletons.
- **Automated QA & Test Suite**: 16 end-to-end integration workflows executed with Node's native test runner and isolated in-memory MongoDB.

---

## Pre-configured Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@library.com` | `AdminPassword@123` | Full system access, archive books, waive fines, manage users |
| **Librarian** | `librarian@library.com` | `LibrarianPassword@123` | Book CRUD, circulation (issue/return), record payments, manage members |
| **Member 1 (Alice)** | `alice@example.com` | `MemberPassword@123` | Browse catalog, place reservations, view personal loan history |
| **Member 2 (Bob)** | `bob@example.com` | `MemberPassword@123` | Browse catalog, view personal history, renew eligible loans |

---

## Exact Local Setup Instructions

### 1. Prerequisites
Ensure **Node.js (v18+)** and **npm** are installed on your machine.
*(Note: If running on a Windows system where Node.js was extracted locally, add `C:\Users\somaraju\nodejs` to your PATH).*

### 2. Install Dependencies
Install all workspace dependencies across root, backend, and frontend:
```bash
# From the project root
npm run install:all
```
*(Or individually: `cd backend && npm install`, then `cd ../frontend && npm install`).*

### 3. Environment Configuration
Configuration files (`.env` and `.env.example`) are pre-populated in `backend/`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/library_management
JWT_SECRET=super_secret_jwt_key_production_change_this_minimum_32_characters_long_12345
JWT_EXPIRE=24h
BORROW_PERIOD_DAYS=14
FINE_RATE_PER_DAY=1.00
MAX_FINE_AMOUNT=50.00
MAX_RENEWALS=2
DEFAULT_MEMBER_BORROWING_LIMIT=5
CLIENT_URL=http://localhost:5173
```

### 4. Running the Application

#### Option A: Zero-Dependency Embedded Mode (Recommended for Evaluation)
Launches the full backend with an in-memory MongoDB database pre-seeded with catalog books, loans, and demo accounts:
```bash
npm run dev:memory
```

#### Option B: Connecting to a Local MongoDB or MongoDB Atlas
1. Start MongoDB locally or supply your Atlas connection string in `backend/.env` under `MONGODB_URI`.
2. Seed the initial demo catalog and users:
   ```bash
   npm run seed
   ```
3. Start the backend:
   ```bash
   npm run dev:backend
   ```
4. In a separate terminal, start the frontend:
   ```bash
   npm run dev:frontend
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running the Automated Test Suite

Run the complete 16-workflow automated test suite (runs in an isolated in-memory MongoDB environment):
```bash
npm test
```

Expected Output:
```text
ok 1 - 1. Administrator Login - should authenticate successfully with valid credentials and reject invalid ones
ok 2 - 2. Unauthorized Request Rejection - should reject unauthenticated requests and enforce RBAC
ok 3 - 3. Book Creation and Editing - should create book with physical copies and update metadata
ok 4 - 4. Duplicate ISBN Rejection - should prevent duplicate ISBNs with 409 conflict
ok 5 - 5. Member Registration - should register user and prevent privilege escalation
ok 6 - 6. Successful Book Issue - should issue copy and update inventory counts atomically
ok 7 - 7. Unavailable-Copy Rejection - should reject issue request when no copies are available
ok 8 - 8. Successful Book Return - should return copy and restore inventory counts
ok 9 - 9. Duplicate-Return Rejection - should reject returning an already returned loan
ok 10 - 10. Loan Renewal Eligibility - should allow renewal when eligible and reject when overdue or maxed
ok 11 - 11. Reservation Creation - should place reservation and prevent duplicate active reservations
ok 12 - 12. Fine Calculation and Payment Recording - should calculate overdue fine and record payment
ok 13 - 13. Dashboard Metric Accuracy - should return live metrics matching direct database counts
ok 14 - 14. Member Data Isolation - should reject member attempts to access other members private records
ok 15 - 15. Data Persistence - should reliably persist and retrieve multi-field documents
ok 16 - 16. Validation and Error Handling - should return clean 400 for bad ObjectIds and missing fields
# tests 16
# pass 16
# fail 0
```

---

## Production Build & Single-Port Serving

To build the client bundle for production:
```bash
npm run build
```
Once built into `frontend/dist`, the Express server serves both the REST API and the React frontend on port `5000`:
```bash
npm start
```
Navigate to [http://localhost:5000](http://localhost:5000).
