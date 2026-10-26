const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid identifier format: '${err.value}'`;
  }

  // Handle Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    if (field === 'isbn') {
      message = `A book with ISBN '${value}' already exists in the catalog.`;
    } else if (field === 'email') {
      message = `An account with email '${value}' already exists.`;
    } else if (field === 'barcode') {
      message = `A copy with barcode '${value}' already exists.`;
    } else {
      message = `Duplicate value '${value}' entered for unique field '${field}'.`;
    }
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('. ');
  }

  // Log server errors for internal monitoring (exclude client 4xx errors)
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR ${statusCode}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
