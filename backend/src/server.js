import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initDb } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import assignmentRoutes from './routes/assignments.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/auth.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Set JWT_SECRET to a random string of at least 16 characters (see .env.example).');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/assignments', requireAuth, assignmentRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
initDb()
  .then(() => app.listen(port, () => console.log(`CodeTrace API listening on :${port}`)))
  .catch((err) => { console.error('Could not connect to the database:', err.message); process.exit(1); });
