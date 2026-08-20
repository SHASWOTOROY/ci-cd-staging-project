import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, pinned, notebook_id } = req.query;
    let sql = `
      SELECT n.*, nb.name AS notebook_name
      FROM notes n
      LEFT JOIN notebooks nb ON n.notebook_id = nb.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (n.title ILIKE $${params.length} OR n.content ILIKE $${params.length})`;
    }
    if (pinned === 'true') {
      sql += ` AND n.is_pinned = TRUE`;
    }
    if (notebook_id) {
      params.push(notebook_id);
      sql += ` AND n.notebook_id = $${params.length}`;
    }

    sql += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM notes WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, notebook_id, color, tags, is_pinned } = req.body;
    const { rows } = await query(
      `INSERT INTO notes (title, content, notebook_id, color, tags, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        title || 'Untitled',
        content || '',
        notebook_id || 1,
        color || '#ffffff',
        tags || [],
        is_pinned || false,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, content, notebook_id, color, tags, is_pinned } = req.body;
    const { rows } = await query(
      `UPDATE notes SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        notebook_id = COALESCE($3, notebook_id),
        color = COALESCE($4, color),
        tags = COALESCE($5, tags),
        is_pinned = COALESCE($6, is_pinned),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, content, notebook_id, color, tags, is_pinned, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/pin', async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE notes SET is_pinned = NOT is_pinned, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM notes WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Note not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
