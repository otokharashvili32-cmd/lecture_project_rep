const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// API routes

// Users (expose non-sensitive info)
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'failed to load users' });
  }
});

// Shows
app.get('/api/shows', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, date, city, venue FROM shows ORDER BY date ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: 'failed to load shows' });
  }
});

// Merch
app.get('/api/merch', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, price FROM merch ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching merch:', error);
    res.status(500).json({ error: 'failed to load merch' });
  }
});

// Discography
app.get('/api/discography', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, title, year, cover_image AS \"coverImage\" FROM albums ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching discography:', error);
    res.status(500).json({ error: 'failed to load discography' });
  }
});

// User show reservations

// Get all reserved show IDs for a user
app.get('/api/reservations', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT show_id AS \"showId\" FROM user_show_reservations WHERE user_id = $1 ORDER BY reserved_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'failed to load reservations' });
  }
});

// Reserve a show for a user (idempotent: multiple calls do nothing extra)
app.post('/api/reservations', async (req, res) => {
  const { userId, showId } = req.body || {};

  if (!userId || !showId) {
    return res.status(400).json({
      success: false,
      error: 'userId and showId are required',
    });
  }

  try {
    await db.query(
      'INSERT INTO user_show_reservations (user_id, show_id) VALUES ($1, $2) ON CONFLICT (user_id, show_id) DO NOTHING',
      [userId, showId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Reserve show error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not reserve show',
    });
  }
});

// Unreserve a show for a user
app.delete('/api/reservations', async (req, res) => {
  const { userId, showId } = req.body || {};

  if (!userId || !showId) {
    return res.status(400).json({
      success: false,
      error: 'userId and showId are required',
    });
  }

  try {
    await db.query(
      'DELETE FROM user_show_reservations WHERE user_id = $1 AND show_id = $2',
      [userId, showId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Unreserve show error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not unreserve show',
    });
  }
});

// Auth routes (fake auth, using hardcoded users)

// Login: checks email/password against the users table
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    const result = await db.query(
      'SELECT id, email, password FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
      [normalizedEmail]
    );

    const user = result.rows[0];

    const correctEmail = !!user;
    const correctPassword = user ? user.password === password : false;

    if (correctEmail && correctPassword) {
      const { password: _pw, ...safeUser } = user;
      return res.json({
        success: true,
        user: safeUser,
      });
    }

    if (!correctEmail && !correctPassword) {
      return res.json({
        success: false,
        error: 'incorrect password or email',
      });
    }

    if (!correctEmail) {
      return res.json({
        success: false,
        error: 'incorrect email',
      });
    }

    return res.json({
      success: false,
      error: 'incorrect password',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'login failed',
    });
  }
});

// Sign up: accepts email/password and adds a user in memory (no duplicate emails)
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'email and password are required',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  (async () => {
    try {
      // Check if a user with this email already exists
      const existing = await db.query(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'email already exists',
        });
      }

      const insert = await db.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
        [normalizedEmail, password]
      );

      return res.status(201).json({
        success: true,
        user: insert.rows[0],
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        success: false,
        error: 'sign up failed',
      });
    }
  })();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

