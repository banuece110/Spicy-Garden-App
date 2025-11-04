const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cors = require('cors');
require('dotenv').config();

const { requireAuth, requireAdmin, attachUserIfAny } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET || 'change_me';
const sessionDbFile = path.join(__dirname, '..', 'data', 'sessions.sqlite');

app.use(
  session({
    store: new SQLiteStore({ db: path.basename(sessionDbFile), dir: path.dirname(sessionDbFile) }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

app.use(attachUserIfAny);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api', orderRoutes);

// Public config for client
app.get('/api/config', (_req, res) => {
  res.json({ paymentBaseUrl: process.env.PAYMENT_BASE_URL || '' });
});

// Static frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Fallback to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


