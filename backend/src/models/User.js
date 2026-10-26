const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'librarian', 'member'],
        message: 'Role must be admin, librarian, or member'
      },
      default: 'member'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'deactivated'],
        message: 'Status must be active, suspended, or deactivated'
      },
      default: 'active'
    },
    memberId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    borrowingLimit: {
      type: Number,
      default: 5,
      min: [1, 'Borrowing limit must be at least 1']
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip password)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Auto-assign memberId if member role and not provided
userSchema.pre('save', async function (next) {
  if (!this.memberId && this.role === 'member') {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.memberId = `LIB-${Date.now().toString().slice(-4)}${randomSuffix}`;
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
