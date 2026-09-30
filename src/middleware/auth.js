import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

// Verifies the Bearer JWT and attaches the decoded payload to req.user.
// Throws an UnauthorizedError for any invalid/missing/expired token.
const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('JWT has expired');
    }
    throw new UnauthorizedError('Invalid JWT');
  }
};

export { authenticate };
