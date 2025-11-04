const express = require('express');
const { all, get, run } = require('../db');

const router = express.Router();

// Create order from items: [{id, qty}]
router.post('/orders', (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });

  // Validate and compute total using current menu prices
  let total = 0;
  const detailed = [];
  for (const line of items) {
    const itemId = Number(line.id);
    const qty = Number(line.qty || 1);
    if (!itemId || qty <= 0) return res.status(400).json({ error: 'Invalid item line' });
    const item = get('SELECT id, name, price_cents FROM menu_items WHERE id=? AND is_available=1', [itemId]);
    if (!item) return res.status(400).json({ error: `Item not available: ${itemId}` });
    const lineTotal = item.price_cents * qty;
    total += lineTotal;
    detailed.push({ item_id: item.id, qty, price_cents: item.price_cents });
  }

  const info = run('INSERT INTO orders (total_cents, payment_status) VALUES (?, ?)', [total, 'pending']);
  const orderId = info.lastInsertRowid;
  for (const d of detailed) {
    run('INSERT INTO order_items (order_id, item_id, qty, price_cents) VALUES (?, ?, ?, ?)', [orderId, d.item_id, d.qty, d.price_cents]);
  }

  res.status(201).json({ id: orderId, total_cents: total });
});

// Get order by id
router.get('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const order = get('SELECT * FROM orders WHERE id=?', [id]);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const items = all(
    `SELECT oi.item_id, mi.name, oi.qty, oi.price_cents
     FROM order_items oi JOIN menu_items mi ON mi.id = oi.item_id
     WHERE oi.order_id = ?`,
    [id]
  );
  res.json({ ...order, items });
});

// Monthly report
router.get('/reports/monthly', (req, res) => {
  const year = String(req.query.year || '');
  const month = String(req.query.month || '');
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return res.status(400).json({ error: 'Invalid year/month' });

  const summary = get(
    `SELECT SUM(total_cents) as total_cents, COUNT(*) as orders_count
     FROM orders
     WHERE strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?`,
    [year, month]
  ) || { total_cents: 0, orders_count: 0 };

  const items = all(
    `SELECT mi.name, SUM(oi.qty) as qty, SUM(oi.qty * oi.price_cents) as revenue_cents
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     JOIN menu_items mi ON mi.id = oi.item_id
     WHERE strftime('%Y', o.created_at) = ? AND strftime('%m', o.created_at) = ?
     GROUP BY mi.name
     ORDER BY revenue_cents DESC`,
    [year, month]
  );

  res.json({ summary, items });
});

module.exports = router;



