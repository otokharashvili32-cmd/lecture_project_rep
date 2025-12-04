const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const crypto = require('crypto');

// Configure Cloudinary using CLOUDINARY_URL from .env
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

// Configure multer to store files in memory (buffer) for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Simple image upload route using Cloudinary
// Expects a form-data request with a single file field named "image"
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Upload the file buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'the-spectator' },
        (error, uploadedResult) => {
          if (error) return reject(error);
          resolve(uploadedResult);
        }
      );

      stream.end(req.file.buffer);
    });

    return res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
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

// CREATE USER_SONG_LIKES TABLE ENDPOINT
app.post('/api/create-song-likes-table', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_song_likes (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, song_id)
      );
    `);
    res.json({ success: true, message: 'User song likes table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE SONG_RATINGS TABLE ENDPOINT
app.post('/api/create-song-ratings-table', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS song_ratings (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, song_id)
      );
    `);
    res.json({ success: true, message: 'Song ratings table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD PRICE COLUMN TO SHOWS TABLE ENDPOINT
app.post('/api/add-shows-price-column', async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE shows 
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
    `);
    
    // Update existing shows with default prices if they don't have prices
    await db.query(`
      UPDATE shows 
      SET price = 50.00 
      WHERE price IS NULL;
    `);
    
    res.json({ success: true, message: 'Price column added to shows table' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD AVAILABLE_SEATS COLUMN TO SHOWS TABLE ENDPOINT
app.post('/api/add-shows-available-seats-column', async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE shows 
      ADD COLUMN IF NOT EXISTS available_seats INT DEFAULT 30 CHECK (available_seats >= 0);
    `);
    
    // Set all shows to 30 seats initially
    await db.query(`
      UPDATE shows 
      SET available_seats = 30 
      WHERE available_seats IS NULL;
    `);
    
    // Set the first show (Berlin — Unknown Hall on 2025-03-01) to sold out (0 seats)
    await db.query(`
      UPDATE shows 
      SET available_seats = 0 
      WHERE city = 'Berlin' AND venue = 'Unknown Hall' AND date = '2025-03-01';
    `);
    
    res.json({ success: true, message: 'Available seats column added to shows table' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to generate random date between Jan 2025 and June 2026
function getRandomDate() {
  const start = new Date('2025-01-01');
  const end = new Date('2026-06-30');
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const randomDate = new Date(randomTime);
  const year = randomDate.getFullYear();
  const month = String(randomDate.getMonth() + 1).padStart(2, '0');
  const day = String(randomDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean up and set correct shows
app.post('/api/setup-shows', async (req, res) => {
  try {
    // Delete all existing shows
    await db.query('DELETE FROM shows');
    
    // Generate random seats between 100-200 for Berlin, Paris, London, Tbilisi
    const berlinSeats = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    const parisSeats = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    const londonSeats = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    const tbilisiSeats = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    
    // Generate random dates for each show
    const berlinDate = getRandomDate();
    const parisDate = getRandomDate();
    const londonDate = getRandomDate();
    const tbilisiDate = getRandomDate();
    const kutaisiDate = getRandomDate();
    
    // Insert the 5 shows
    await db.query(`
      INSERT INTO shows (date, city, venue, price, available_seats) VALUES
        ($1, 'Berlin', 'Unknown Hall', 50.00, $2),
        ($3, 'Paris', 'Hidden Theatre', 85.00, $4),
        ($5, 'London', 'Basement 13', 70.00, $6),
        ($7, 'Tbilisi', 'Concert Hall', 60.00, $8),
        ($9, 'Kutaisi', 'City Center', 55.00, 0)
    `, [berlinDate, berlinSeats, parisDate, parisSeats, londonDate, londonSeats, tbilisiDate, tbilisiSeats, kutaisiDate]);
    
    res.json({ 
      success: true, 
      message: 'Shows cleaned up and set correctly',
      shows: {
        berlin: { date: berlinDate, seats: berlinSeats },
        paris: { date: parisDate, seats: parisSeats },
        london: { date: londonDate, seats: londonSeats },
        tbilisi: { date: tbilisiDate, seats: tbilisiSeats },
        kutaisi: { date: kutaisiDate, seats: 0 }
      }
    });
  } catch (error) {
    console.error('Error setting up shows:', error);
    res.status(500).json({ success: false, error: 'Failed to setup shows' });
  }
});

// Update show prices and availability
app.post('/api/update-shows-prices-availability', async (req, res) => {
  try {
    // Update London show to $70
    await db.query(`
      UPDATE shows 
      SET price = 70.00 
      WHERE city = 'London';
    `);
    
    // Update Paris show to $85
    await db.query(`
      UPDATE shows 
      SET price = 85.00 
      WHERE city = 'Paris';
    `);
    
    // Make Berlin show available (set to 30 seats)
    await db.query(`
      UPDATE shows 
      SET available_seats = 30 
      WHERE city = 'Berlin' AND venue = 'Unknown Hall';
    `);
    
    res.json({ success: true, message: 'Show prices and availability updated' });
  } catch (error) {
    console.error('Error updating shows:', error);
    res.status(500).json({ success: false, error: 'Failed to update shows' });
  }
});

// Purchase ticket for a show
app.post('/api/shows/:showId/purchase', async (req, res) => {
  const showId = parseInt(req.params.showId, 10);
  const { userId, quantity = 1 } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  const ticketQuantity = Math.max(1, Math.min(4, parseInt(quantity, 10) || 1));

  try {
    // Check available seats
    const showResult = await db.query(
      'SELECT available_seats FROM shows WHERE id = $1',
      [showId]
    );

    if (showResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'show not found',
      });
    }

    const availableSeats = showResult.rows[0].available_seats;

    if (availableSeats <= 0) {
      return res.status(400).json({
        success: false,
        error: 'show is sold out',
      });
    }

    if (availableSeats < ticketQuantity) {
      return res.status(400).json({
        success: false,
        error: `only ${availableSeats} seats available`,
      });
    }

    // Decrease available seats by quantity
    await db.query(
      'UPDATE shows SET available_seats = available_seats - $1 WHERE id = $2',
      [ticketQuantity, showId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Purchase show error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not purchase ticket',
    });
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
      'SELECT id, date, city, venue, price, available_seats AS "availableSeats" FROM shows ORDER BY date ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: 'failed to load shows' });
  }
});

// Helper: check if a user is admin
async function isAdminUser(userId) {
  if (!userId) return false;
  try {
    const result = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return false;
    return result.rows[0].role === 'admin';
  } catch (error) {
    console.error('Error checking admin user:', error);
    return false;
  }
}

// Admin: create a new show
app.post('/api/admin/shows', async (req, res) => {
  const { userId, date, city, venue, price, availableSeats } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!date || !city) {
    return res.status(400).json({ success: false, error: 'date and city are required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      `INSERT INTO shows (date, city, venue, price, available_seats)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, date, city, venue, price, available_seats AS "availableSeats"`,
      [date, city, venue || null, price || null, availableSeats != null ? availableSeats : 30]
    );

    res.status(201).json({ success: true, show: result.rows[0] });
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ success: false, error: 'failed to create show' });
  }
});

// Admin: update an existing show (name/city/venue/price/date/available seats)
app.put('/api/admin/shows/:showId', async (req, res) => {
  const showId = parseInt(req.params.showId, 10);
  const { userId, date, city, venue, price, availableSeats } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!showId) {
    return res.status(400).json({ success: false, error: 'showId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    // Build dynamic UPDATE query based on provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (date !== undefined) {
      fields.push(`date = $${idx++}`);
      values.push(date);
    }
    if (city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(city);
    }
    if (venue !== undefined) {
      fields.push(`venue = $${idx++}`);
      values.push(venue);
    }
    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(price);
    }
    if (availableSeats !== undefined) {
      fields.push(`available_seats = $${idx++}`);
      values.push(availableSeats);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(showId);

    const query = `
      UPDATE shows
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, date, city, venue, price, available_seats AS "availableSeats"
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'show not found' });
    }

    res.json({ success: true, show: result.rows[0] });
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ success: false, error: 'failed to update show' });
  }
});

// Admin: delete a show
app.delete('/api/admin/shows/:showId', async (req, res) => {
  const showId = parseInt(req.params.showId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!showId) {
    return res.status(400).json({ success: false, error: 'showId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      'DELETE FROM shows WHERE id = $1 RETURNING id',
      [showId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'show not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ success: false, error: 'failed to delete show' });
  }
});

// =========================
// ADMIN: MERCH MANAGEMENT
// =========================

// Admin: create a new merch item
app.post('/api/admin/merch', async (req, res) => {
  const { userId, name, price, type, variant, availableQuantity } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!name || price == null) {
    return res.status(400).json({ success: false, error: 'name and price are required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      `INSERT INTO merch (name, price, type, variant, available_quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, price, type, variant, available_quantity AS "availableQuantity"`,
      [
        name,
        price,
        type || null,
        variant || null,
        availableQuantity != null ? availableQuantity : 20,
      ]
    );

    res.status(201).json({ success: true, merch: result.rows[0] });
  } catch (error) {
    console.error('Error creating merch item:', error);
    res.status(500).json({ success: false, error: 'failed to create merch item' });
  }
});

// Admin: update an existing merch item
app.put('/api/admin/merch/:merchId', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId, name, price, type, variant, availableQuantity } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!merchId) {
    return res.status(400).json({ success: false, error: 'merchId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(price);
    }
    if (type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(type);
    }
    if (variant !== undefined) {
      fields.push(`variant = $${idx++}`);
      values.push(variant);
    }
    if (availableQuantity !== undefined) {
      fields.push(`available_quantity = $${idx++}`);
      values.push(availableQuantity);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(merchId);

    const query = `
      UPDATE merch
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, price, type, variant, available_quantity AS "availableQuantity"
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'merch item not found' });
    }

    res.json({ success: true, merch: result.rows[0] });
  } catch (error) {
    console.error('Error updating merch item:', error);
    res.status(500).json({ success: false, error: 'failed to update merch item' });
  }
});

// Admin: delete a merch item
app.delete('/api/admin/merch/:merchId', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!merchId) {
    return res.status(400).json({ success: false, error: 'merchId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      'DELETE FROM merch WHERE id = $1 RETURNING id',
      [merchId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'merch item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting merch item:', error);
    res.status(500).json({ success: false, error: 'failed to delete merch item' });
  }
});

// Merch
app.get('/api/merch', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, price, type, variant, available_quantity AS "availableQuantity" FROM merch ORDER BY type ASC, id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching merch:', error);
    res.status(500).json({ error: 'failed to load merch' });
  }
});

// Add available_quantity column to merch table
app.post('/api/add-merch-available-quantity-column', async (req, res) => {
  try {
    // Add available_quantity column if it doesn't exist
    await db.query(`
      ALTER TABLE merch 
      ADD COLUMN IF NOT EXISTS available_quantity INT DEFAULT 20 CHECK (available_quantity >= 0);
    `);
    
    // Set all items to 20 initially
    await db.query(`
      UPDATE merch 
      SET available_quantity = 20 
      WHERE available_quantity IS NULL;
    `);
    
    // Set "AMAO live at Bassiani VINYL" to sold out (0)
    await db.query(`
      UPDATE merch 
      SET available_quantity = 0 
      WHERE name = 'AMAO live at Bassiani VINYL';
    `);
    
    res.json({ success: true, message: 'Available quantity column added to merch table' });
  } catch (error) {
    console.error('Error adding available quantity column:', error);
    res.status(500).json({ success: false, error: 'Failed to add available quantity column' });
  }
});

// Purchase merch item
app.post('/api/merch/:merchId/purchase', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId, quantity = 1 } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  const itemQuantity = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));

  try {
    // Check available quantity
    const merchResult = await db.query(
      'SELECT available_quantity FROM merch WHERE id = $1',
      [merchId]
    );

    if (merchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'merch item not found',
      });
    }

    const availableQuantity = merchResult.rows[0].available_quantity;

    if (availableQuantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'item is sold out',
      });
    }

    if (availableQuantity < itemQuantity) {
      return res.status(400).json({
        success: false,
        error: `only ${availableQuantity} items available`,
      });
    }

    // Check if user already purchased this item
    const existingPurchase = await db.query(
      'SELECT * FROM user_merch_purchases WHERE user_id = $1 AND merch_id = $2',
      [userId, merchId]
    );

    if (existingPurchase.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'you have already purchased this item',
      });
    }

    // Decrease available quantity by quantity
    await db.query(
      'UPDATE merch SET available_quantity = available_quantity - $1 WHERE id = $2',
      [itemQuantity, merchId]
    );

    // Record the purchase in database
    await db.query(
      'INSERT INTO user_merch_purchases (user_id, merch_id) VALUES ($1, $2) ON CONFLICT (user_id, merch_id) DO NOTHING',
      [userId, merchId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Purchase merch error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not purchase item',
    });
  }
});

// Get all purchased merch items for a user
app.get('/api/users/:userId/purchased-merch', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT merch_id AS "merchId" FROM user_merch_purchases WHERE user_id = $1 ORDER BY purchased_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchased merch:', error);
    res.status(500).json({ error: 'failed to load purchased merch' });
  }
});

// Cancel merch purchase (optional - increase quantity back)
app.delete('/api/merch/:merchId/purchase', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    // Check if purchase exists
    const purchaseResult = await db.query(
      'SELECT * FROM user_merch_purchases WHERE user_id = $1 AND merch_id = $2',
      [userId, merchId]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'purchase not found',
      });
    }

    // Delete the purchase
    await db.query(
      'DELETE FROM user_merch_purchases WHERE user_id = $1 AND merch_id = $2',
      [userId, merchId]
    );

    // Increase available quantity back
    await db.query(
      'UPDATE merch SET available_quantity = available_quantity + 1 WHERE id = $1',
      [merchId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Cancel purchase error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not cancel purchase',
    });
  }
});

// Create user_merch_purchases table endpoint
app.post('/api/create-user-merch-purchases-table', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_merch_purchases (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merch_id INT NOT NULL REFERENCES merch(id) ON DELETE CASCADE,
        purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, merch_id)
      );
    `);

    res.json({ success: true, message: 'User merch purchases table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update merch table with expanded items
app.post('/api/expand-merch-items', async (req, res) => {
  try {
    // Add type and variant columns if they don't exist
    await db.query(`
      ALTER TABLE merch 
      ADD COLUMN IF NOT EXISTS type TEXT;
    `);
    await db.query(`
      ALTER TABLE merch 
      ADD COLUMN IF NOT EXISTS variant TEXT;
    `);
    
    // Delete old merch items
    await db.query('DELETE FROM merch');
    
    // Insert expanded merch items
    await db.query(`
      INSERT INTO merch (name, price, type, variant) VALUES
        ('Blue Shirt', 30, 'shirt', 'blue'),
        ('Black Shirt', 35, 'shirt', 'black'),
        ('Red Shirt', 35, 'shirt', 'red'),
        ('Custom Fender Stratocaster', 1400, 'guitar', 'Custom Fender Stratocaster'),
        ('Custom Fender Telecaster', 1500, 'guitar', 'Custom Fender Telecaster'),
        ('Custom Gibson Les Paul', 1999, 'guitar', 'Custom Gibson Les Paul'),
        ('AMAO VINYL', 95, 'vinyl', 'AMAO'),
        ('AMAO disk 2 VINYL', 95, 'vinyl', 'AMAO disk 2'),
        ('AMAO live at Bassiani VINYL', 68, 'vinyl', 'AMAO live at Bassiani')
    `);
    
    res.json({ success: true, message: 'Merch items expanded successfully' });
  } catch (error) {
    console.error('Error expanding merch items:', error);
    res.status(500).json({ success: false, error: 'Failed to expand merch items' });
  }
});

// Get all wishlist items for a user
app.get('/api/users/:userId/wishlist', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT merch_id AS "merchId" FROM user_merch_wishlist WHERE user_id = $1 ORDER BY added_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'failed to load wishlist' });
  }
});

// Add item to wishlist
app.post('/api/merch/:merchId/wishlist', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    await db.query(
      'INSERT INTO user_merch_wishlist (user_id, merch_id) VALUES ($1, $2) ON CONFLICT (user_id, merch_id) DO NOTHING',
      [userId, merchId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not add to wishlist',
    });
  }
});

// Remove item from wishlist
app.delete('/api/merch/:merchId/wishlist', async (req, res) => {
  const merchId = parseInt(req.params.merchId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    await db.query(
      'DELETE FROM user_merch_wishlist WHERE user_id = $1 AND merch_id = $2',
      [userId, merchId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not remove from wishlist',
    });
  }
});

// Create user_merch_wishlist table endpoint
app.post('/api/create-user-merch-wishlist-table', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_merch_wishlist (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merch_id INT NOT NULL REFERENCES merch(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, merch_id)
      );
    `);

    res.json({ success: true, message: 'User merch wishlist table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// =========================
// ADMIN: ALBUM MANAGEMENT
// =========================

// Admin: create a new album
app.post('/api/admin/albums', async (req, res) => {
  const { userId, title, year, coverImage } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!title) {
    return res.status(400).json({ success: false, error: 'title is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      `INSERT INTO albums (title, year, cover_image)
       VALUES ($1, $2, $3)
       RETURNING id, title, year, cover_image AS "coverImage"`,
      [title, year || null, coverImage || null]
    );

    res.status(201).json({ success: true, album: result.rows[0] });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ success: false, error: 'failed to create album' });
  }
});

// Admin: update an album
app.put('/api/admin/albums/:albumId', async (req, res) => {
  const albumId = parseInt(req.params.albumId, 10);
  const { userId, title, year, coverImage } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!albumId) {
    return res.status(400).json({ success: false, error: 'albumId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (year !== undefined) {
      fields.push(`year = $${idx++}`);
      values.push(year);
    }
    if (coverImage !== undefined) {
      fields.push(`cover_image = $${idx++}`);
      values.push(coverImage);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(albumId);

    const query = `
      UPDATE albums
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, title, year, cover_image AS "coverImage"
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'album not found' });
    }

    res.json({ success: true, album: result.rows[0] });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ success: false, error: 'failed to update album' });
  }
});

// Admin: delete an album (will cascade delete songs)
app.delete('/api/admin/albums/:albumId', async (req, res) => {
  const albumId = parseInt(req.params.albumId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!albumId) {
    return res.status(400).json({ success: false, error: 'albumId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      'DELETE FROM albums WHERE id = $1 RETURNING id',
      [albumId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'album not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ success: false, error: 'failed to delete album' });
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

// =========================
// ADMIN: SONG MANAGEMENT
// =========================

// Admin: create a new song
app.post('/api/admin/songs', async (req, res) => {
  const { userId, albumId, title, duration, trackNumber } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!albumId || !title || !duration || trackNumber == null) {
    return res.status(400).json({
      success: false,
      error: 'albumId, title, duration, and trackNumber are required',
    });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      `INSERT INTO songs (album_id, title, duration, track_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, album_id AS "albumId", title, duration, track_number AS "trackNumber"`,
      [albumId, title, duration, trackNumber]
    );

    res.status(201).json({ success: true, song: result.rows[0] });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ success: false, error: 'failed to create song' });
  }
});

// Admin: update an existing song
app.put('/api/admin/songs/:songId', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId, albumId, title, duration, trackNumber } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!songId) {
    return res.status(400).json({ success: false, error: 'songId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (albumId !== undefined) {
      fields.push(`album_id = $${idx++}`);
      values.push(albumId);
    }
    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (duration !== undefined) {
      fields.push(`duration = $${idx++}`);
      values.push(duration);
    }
    if (trackNumber !== undefined) {
      fields.push(`track_number = $${idx++}`);
      values.push(trackNumber);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(songId);

    const query = `
      UPDATE songs
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, album_id AS "albumId", title, duration, track_number AS "trackNumber"
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'song not found' });
    }

    res.json({ success: true, song: result.rows[0] });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ success: false, error: 'failed to update song' });
  }
});

// Admin: delete a song
app.delete('/api/admin/songs/:songId', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!songId) {
    return res.status(400).json({ success: false, error: 'songId is required' });
  }

  try {
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }

    const result = await db.query(
      'DELETE FROM songs WHERE id = $1 RETURNING id',
      [songId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'song not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ success: false, error: 'failed to delete song' });
  }
});

// Song likes endpoints

// Check if user liked a song
app.get('/api/songs/:songId/liked', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const userId = parseInt(req.query.userId, 10);

  if (!userId) {
    return res.json({ liked: false });
  }

  try {
    const result = await db.query(
      'SELECT 1 FROM user_song_likes WHERE user_id = $1 AND song_id = $2 LIMIT 1',
      [userId, songId]
    );
    res.json({ liked: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking song like:', error);
    res.status(500).json({ error: 'failed to check song like' });
  }
});

// Get all liked songs for a user
app.get('/api/users/:userId/liked-songs', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT song_id AS "songId" FROM user_song_likes WHERE user_id = $1 ORDER BY liked_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    res.status(500).json({ error: 'failed to load liked songs' });
  }
});

// Like a song
app.post('/api/songs/:songId/like', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    await db.query(
      'INSERT INTO user_song_likes (user_id, song_id) VALUES ($1, $2) ON CONFLICT (user_id, song_id) DO NOTHING',
      [userId, songId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Like song error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not like song',
    });
  }
});

// Unlike a song
app.delete('/api/songs/:songId/like', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    await db.query(
      'DELETE FROM user_song_likes WHERE user_id = $1 AND song_id = $2',
      [userId, songId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Unlike song error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not unlike song',
    });
  }
});

// Song ratings endpoints

// Get all ratings/comments for a song
app.get('/api/songs/:songId/ratings', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);

  try {
    const result = await db.query(
      `SELECT sr.id, sr.user_id AS "userId", sr.rating, sr.comment, sr.rated_at AS "ratedAt",
              COALESCE(u.username, u.email) AS "displayName"
       FROM song_ratings sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.song_id = $1
       ORDER BY sr.rated_at DESC`,
      [songId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching song ratings:', error);
    res.status(500).json({ error: 'failed to load ratings' });
  }
});

// Get average rating for a song
app.get('/api/songs/:songId/rating-average', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);

  try {
    const result = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count
       FROM song_ratings
       WHERE song_id = $1`,
      [songId]
    );
    res.json({
      average: parseFloat(result.rows[0].average) || 0,
      count: parseInt(result.rows[0].count, 10) || 0
    });
  } catch (error) {
    console.error('Error fetching average rating:', error);
    res.status(500).json({ error: 'failed to load average rating' });
  }
});

// Submit rating/comment for a song
app.post('/api/songs/:songId/ratings', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId, rating, comment } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: 'rating must be between 1 and 5',
    });
  }

  try {
    await db.query(
      `INSERT INTO song_ratings (user_id, song_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, song_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, rated_at = NOW()`,
      [userId, songId, rating, comment || null]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Submit rating error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not submit rating',
    });
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

// Get all purchased show IDs for a user
app.get('/api/users/:userId/purchased-shows', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT show_id AS "showId" FROM user_show_purchases WHERE user_id = $1 ORDER BY purchased_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchased shows:', error);
    res.status(500).json({ error: 'failed to load purchased shows' });
  }
});

// Cancel purchase (optional - increase seats back)
app.delete('/api/shows/:showId/purchase', async (req, res) => {
  const showId = parseInt(req.params.showId, 10);
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required',
    });
  }

  try {
    // Check if purchase exists
    const purchaseResult = await db.query(
      'SELECT * FROM user_show_purchases WHERE user_id = $1 AND show_id = $2',
      [userId, showId]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'purchase not found',
      });
    }

    // Delete the purchase
    await db.query(
      'DELETE FROM user_show_purchases WHERE user_id = $1 AND show_id = $2',
      [userId, showId]
    );

    // Increase available seats back
    await db.query(
      'UPDATE shows SET available_seats = available_seats + 1 WHERE id = $1',
      [showId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Cancel purchase error:', error);
    return res.status(500).json({
      success: false,
      error: 'could not cancel purchase',
    });
  }
});

// Create user_show_purchases table endpoint
app.post('/api/create-user-show-purchases-table', async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_show_purchases (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, show_id)
      );
    `);

    res.json({ success: true, message: 'User show purchases table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
        'SELECT id, email, password, theme_preference, username, role FROM users WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
        [normalizedEmail]
      );

    const user = result.rows[0];

    const correctEmail = !!user;
    const correctPassword = user ? user.password === password : false;

    if (correctEmail && correctPassword) {
      const { password: _pw, ...safeUser } = user;
      // Ensure theme_preference is included, default to 'dark' if null
      safeUser.theme_preference = safeUser.theme_preference || 'dark';
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
        `INSERT INTO users (email, password, theme_preference, role) 
         VALUES ($1, $2, $3, 'user') 
         RETURNING id, email, created_at, theme_preference, username, role`,
        [normalizedEmail, password, 'dark']
      );

      const user = insert.rows[0];
      user.theme_preference = user.theme_preference || 'dark';
      
      return res.status(201).json({
        success: true,
        user: user,
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

// ADD ROLE COLUMN TO USERS TABLE ENDPOINT
// This makes it possible to distinguish normal users from admins.
app.post('/api/add-role-column', async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    `);

    // Ensure all existing users have a role set
    await db.query(`
      UPDATE users
      SET role = 'user'
      WHERE role IS NULL;
    `);

    res.json({ success: true, message: 'role column added/ensured on users table' });
  } catch (error) {
    console.error('Error adding role column:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD THEME_PREFERENCE COLUMN TO USERS TABLE ENDPOINT
app.post('/api/add-theme-preference-column', async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark'));
    `);
    
    // Set all existing users to 'dark' if they don't have a preference
    await db.query(`
      UPDATE users 
      SET theme_preference = 'dark' 
      WHERE theme_preference IS NULL;
    `);
    
    res.json({ success: true, message: 'Theme preference column added to users table' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD USERNAME COLUMN TO USERS TABLE ENDPOINT
app.post('/api/add-username-column', async (req, res) => {
  try {
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS username TEXT;
    `);
    
    res.json({ success: true, message: 'Username column added to users table' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE OR UPDATE A SPECIFIC ADMIN USER
// This will ensure there is a user with the given email/password and role 'admin'.
app.post('/api/create-admin-user', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'email and password are required',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    // Insert or update the admin user
    const result = await db.query(
      `INSERT INTO users (email, password, theme_preference, role)
       VALUES ($1, $2, 'dark', 'admin')
       ON CONFLICT (email) DO UPDATE
         SET password = EXCLUDED.password,
             role = 'admin'
       RETURNING id, email, created_at, theme_preference, username, role`,
      [normalizedEmail, password]
    );

    const adminUser = result.rows[0];
    adminUser.theme_preference = adminUser.theme_preference || 'dark';

    res.json({
      success: true,
      user: adminUser,
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET USER THEME PREFERENCE
app.get('/api/users/:userId/theme', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT theme_preference FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      theme: result.rows[0].theme_preference || 'dark' 
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch theme' });
  }
});

// UPDATE USER THEME PREFERENCE
app.put('/api/users/:userId/theme', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { theme } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (!theme || !['light', 'dark'].includes(theme)) {
    return res.status(400).json({ success: false, error: 'theme must be "light" or "dark"' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET theme_preference = $1 WHERE id = $2 RETURNING theme_preference',
      [theme, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      theme: result.rows[0].theme_preference 
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme' });
  }
});

// GET USER USERNAME
app.get('/api/users/:userId/username', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const result = await db.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      username: result.rows[0].username || null
    });
  } catch (error) {
    console.error('Error fetching username:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch username' });
  }
});

// UPDATE USER USERNAME
app.put('/api/users/:userId/username', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { username } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  if (username === undefined || username === null) {
    return res.status(400).json({ success: false, error: 'username is required' });
  }

  // Allow empty string to clear username
  const usernameValue = username.trim() === '' ? null : username.trim();

  try {
    const result = await db.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING username',
      [usernameValue, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      username: result.rows[0].username 
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update username' 
    });
  }
});

// DELETE USER ACCOUNT
app.delete('/api/users/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  try {
    // Check if user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Delete user (CASCADE will handle related tables)
    await db.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete account' 
    });
  }
});

// CREATE VISITOR COUNTER TABLE
app.post('/api/create-visitor-counter-table', async (req, res) => {
  try {
    // Create table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS visitor_counter (
        id INTEGER PRIMARY KEY DEFAULT 1,
        count INTEGER DEFAULT 0,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);

    // Insert initial row if it doesn't exist
    await db.query(`
      INSERT INTO visitor_counter (id, count)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    res.json({ success: true, message: 'Visitor counter table created successfully' });
  } catch (error) {
    console.error('Error creating visitor counter table:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create visitor counter table' });
  }
});

// GET VISITOR COUNT
app.get('/api/visitor/count', async (req, res) => {
  try {
    const result = await db.query('SELECT count FROM visitor_counter WHERE id = 1');
    
    if (result.rows.length === 0) {
      // If table doesn't exist or row doesn't exist, return 0
      return res.json({ success: true, count: 0 });
    }

    res.json({ success: true, count: result.rows[0].count || 0 });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    // If table doesn't exist, return 0
    res.json({ success: true, count: 0 });
  }
});

// INCREMENT VISITOR COUNT
app.post('/api/visitor/increment', async (req, res) => {
  try {
    // First, ensure the table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS visitor_counter (
        id INTEGER PRIMARY KEY DEFAULT 1,
        count INTEGER DEFAULT 0,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);

    // Insert or update the row
    await db.query(`
      INSERT INTO visitor_counter (id, count)
      VALUES (1, 0)
      ON CONFLICT (id) DO UPDATE SET count = visitor_counter.count + 1
    `);

    // Get the updated count
    const result = await db.query('SELECT count FROM visitor_counter WHERE id = 1');
    const newCount = result.rows[0]?.count || 0;

    res.json({ success: true, count: newCount });
  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to increment visitor count' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

