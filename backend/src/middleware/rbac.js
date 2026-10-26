/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles Allowed roles ('admin', 'librarian', 'member')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

/**
 * Enforce data isolation to prevent Insecure Direct Object Reference (IDOR)
 * Ensures members cannot access or modify records of other members
 */
const enforceMemberIsolation = (paramKey = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admins and Librarians can access any member's data
    if (req.user.role === 'admin' || req.user.role === 'librarian') {
      return next();
    }

    const requestedId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
    const currentUserId = req.user._id.toString();
    const currentMemberId = req.user.memberId;

    if (
      requestedId &&
      requestedId !== currentUserId &&
      requestedId !== currentMemberId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view or modify records belonging to other members'
      });
    }

    next();
  };
};

module.exports = {
  authorize,
  enforceMemberIsolation
};
