import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError, wrap } from '../middleware/error.js';

const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 50,
  message: { error: 'Too many attempts. Try again in a few minutes.' } }));

router.post('/register', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name) throw new HttpError(400, 'Enter your name.');
  if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, hash]);
    res.status(201).json({ user: rows[0], token: signToken(rows[0]) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'An account with this email already exists.');
    throw err;
  }
}));

router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role },
             token: signToken(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
