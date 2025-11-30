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

// Test endpoint to check if songs table exists
app.get('/api/test-songs', async (req, res) => {
  try {
    // Get current database name and all tables
    const dbName = await db.query('SELECT current_database()');
    const allTables = await db.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    // Check if songs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'songs'
      );
    `);
    
    // Try to count songs
    let songCount = null;
    let error = null;
    try {
      const countResult = await db.query('SELECT COUNT(*) FROM songs');
      songCount = countResult.rows[0].count;
    } catch (e) {
      error = e.message;
    }
    
    res.json({
      database: dbName.rows[0].current_database,
      allTables: allTables.rows,
      tableExists: tableCheck.rows[0].exists,
      songCount: songCount,
      error: error,
      connectionString: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE SONGS TABLE ENDPOINT - This will create the table in the exact database the backend uses
app.post('/api/create-songs-table', async (req, res) => {
  try {
    // Create the table
    await db.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        album_id INT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        duration TEXT NOT NULL,
        track_number INT NOT NULL,
        UNIQUE (album_id, track_number)
      );
    `);
    
    // Insert the songs
    await db.query(`
      INSERT INTO songs (album_id, title, duration, track_number) VALUES
        (1, 'THE SPECTATOR', '4:30', 1),
        (1, 'THE CAVE', '6:21', 2),
        (1, 'INDULGENCE', '9:01', 3),
        (1, 'STRINGS', '3:56', 4),
        (1, 'PILATE''S COURT', '11:37', 5),
        (1, 'GETHSEMANE', '3:00', 6),
        (1, 'OUROBOROS', '6:56', 7),
        (1, 'DELIRIUM', '8:02', 8),
        (1, 'SAMSARA', '7:31', 9),
        (1, 'INFERNIAC', '6:20', 10),
        (1, 'MYALGIC ENCEPHALOMYELITIS', '2:24', 11),
        (1, 'SATORI', '3:04', 12),
        (1, 'AMAO', '13:00', 13)
      ON CONFLICT (album_id, track_number) DO NOTHING;
    `);
    
    // Verify
    const countResult = await db.query('SELECT COUNT(*) FROM songs');
    
    res.json({
      success: true,
      message: 'Songs table created and populated',
      songCount: countResult.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
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

// Songs
app.get('/api/songs', async (req, res) => {
  try {
    const albumId = req.query.albumId;
    let query, params;
    
    if (albumId) {
      query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber" FROM songs WHERE album_id = $1 ORDER BY track_number ASC';
      params = [albumId];
    } else {
      query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber" FROM songs ORDER BY album_id ASC, track_number ASC';
      params = [];
    }
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'failed to load songs' });
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

