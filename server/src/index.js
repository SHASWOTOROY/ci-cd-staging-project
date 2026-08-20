import './env.js';
import express from 'express';
import cors from 'cors';
import notesRouter from './routes/notes.js';
import notebooksRouter from './routes/notebooks.js';
import linksRouter from './routes/links.js';
import { pool } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/notes', notesRouter);
app.use('/api/notebooks', notebooksRouter);
app.use('/api/links', linksRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
