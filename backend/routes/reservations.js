const express = require('express');
const { all, get, run } = require('../db');

const router = express.Router();

// Create reservation
router.post('/reservations', (req, res) => {
  const { name, email, phone, date, time, guests, requests } = req.body || {};

  // Validate required fields
  if (!name || !email || !phone || !date || !time || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const info = run(
      `INSERT INTO reservations (name, email, phone, reservation_date, reservation_time, guests, special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, date, time, guests, requests || null, 'pending']
    );

    res.status(201).json({
      id: info.lastInsertRowid,
      message: 'Reservation created successfully'
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// Get all reservations (for admin)
router.get('/reservations', (req, res) => {
  try {
    const reservations = all(
      `SELECT * FROM reservations ORDER BY created_at DESC`
    );
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// Get reservation by id
router.get('/reservations/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reservation ID' });

  try {
    const reservation = get('SELECT * FROM reservations WHERE id=?', [id]);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// Update reservation status (for admin)
router.patch('/reservations/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};

  if (!id) return res.status(400).json({ error: 'Invalid reservation ID' });
  if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    run('UPDATE reservations SET status=? WHERE id=?', [status, id]);
    res.json({ message: 'Reservation status updated' });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

module.exports = router;

