import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM pinned_links ORDER BY sort_order, created_at');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, url, description, icon, sort_order } = req.body;
    const { rows } = await query(
      `INSERT INTO pinned_links (title, url, description, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, url, description || '', icon || 'link', sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, url, description, icon, sort_order } = req.body;
    const { rows } = await query(
      `UPDATE pinned_links SET
        title = COALESCE($1, title),
        url = COALESCE($2, url),
        description = COALESCE($3, description),
        icon = COALESCE($4, icon),
        sort_order = COALESCE($5, sort_order)
       WHERE id = $6 RETURNING *`,
      [title, url, description, icon, sort_order, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Link not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM pinned_links WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Link not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
