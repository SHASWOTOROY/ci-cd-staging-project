import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT nb.*, COUNT(n.id)::int AS note_count
      FROM notebooks nb
      LEFT JOIN notes n ON n.notebook_id = nb.id
      GROUP BY nb.id
      ORDER BY nb.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    const { rows } = await query(
      'INSERT INTO notebooks (name, color) VALUES ($1, $2) RETURNING *',
      [name || 'New Notebook', color || '#6366f1']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM notebooks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Notebook not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
