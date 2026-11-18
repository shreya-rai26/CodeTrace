import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';

export const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Sign in to continue.'));
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Sign in again.'));
  }
}
