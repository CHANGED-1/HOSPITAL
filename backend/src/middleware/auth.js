const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    return unauthorized(res, 'Invalid token');
  }
}

// Usage: authorize('admin', 'doctor')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied for role: ${req.user.role}`);
    }
    next();
  };
}

module.exports = { authenticate, authorize };