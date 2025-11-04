const express = require('express');
const { all, get, run } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public menu list (available only)
router.get('/', (_req, res) => {
  const rows = all('SELECT id, name, price_cents, image_url, is_available FROM menu_items WHERE is_available = 1 ORDER BY id DESC');
  res.json(rows);
});

// Admin: list all
router.get('/all', requireAdmin, (_req, res) => {
  const rows = all('SELECT id, name, price_cents, image_url, is_available FROM menu_items ORDER BY id DESC');
  res.json(rows);
});

// Admin: create item
router.post('/', requireAdmin, (req, res) => {
  const { name, price_cents, image_url, is_available } = req.body || {};
  if (!name || typeof price_cents !== 'number') return res.status(400).json({ error: 'Missing name or price_cents' });
  try {
    const info = run(
      'INSERT INTO menu_items (name, price_cents, image_url, is_available) VALUES (?, ?, ?, ?)',
      [name, price_cents, image_url || '', is_available ? 1 : 1]
    );
    const item = get('SELECT id, name, price_cents, image_url, is_available FROM menu_items WHERE id=?', [info.lastInsertRowid]);
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: 'Create failed', detail: String(e) });
  }
});

// Admin: update item
router.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, price_cents, image_url, is_available } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const existing = get('SELECT * FROM menu_items WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  run(
    'UPDATE menu_items SET name=?, price_cents=?, image_url=?, is_available=? WHERE id=?',
    [
      name ?? existing.name,
      typeof price_cents === 'number' ? price_cents : existing.price_cents,
      image_url ?? existing.image_url,
      typeof is_available === 'number' ? is_available : existing.is_available,
      id,
    ]
  );
  const updated = get('SELECT id, name, price_cents, image_url, is_available FROM menu_items WHERE id=?', [id]);
  res.json(updated);
});

// Admin: delete item
router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  run('DELETE FROM menu_items WHERE id=?', [id]);
  res.json({ ok: true });
});

// Admin: toggle availability
router.patch('/:id/toggle', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = get('SELECT * FROM menu_items WHERE id=?', [id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const newVal = existing.is_available ? 0 : 1;
  run('UPDATE menu_items SET is_available=? WHERE id=?', [newVal, id]);
  const updated = get('SELECT id, name, price_cents, image_url, is_available FROM menu_items WHERE id=?', [id]);
  res.json(updated);
});

module.exports = router;



