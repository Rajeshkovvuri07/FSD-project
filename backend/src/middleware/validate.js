const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId route parameters
 * @param  {...string} paramNames Names of route parameters to validate
 */
const validateObjectId = (...paramNames) => {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = req.params[name] || req.query[name] || req.body[name];
      if (val && !mongoose.Types.ObjectId.isValid(val)) {
        return res.status(400).json({
          success: false,
          message: `Invalid identifier format for parameter '${name}'`
        });
      }
    }
    next();
  };
};

/**
 * Sanitize NoSQL injection vectors by removing keys starting with '$' or containing '.'
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  if (req.query) sanitize(req.query);

  next();
};

module.exports = {
  validateObjectId,
  sanitizeInput
};
