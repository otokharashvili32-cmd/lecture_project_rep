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

// Quick update endpoint for Delirium - place it early so it loads
app.get('/api/fix-delirium', async (req, res) => {
  try {
    // Ensure column exists
    try {
      await db.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_url TEXT;`);
    } catch (e) {
      // Column might already exist, that's fine
    }
    
    // Update Delirium (song ID 8)
    const result = await db.query(`
      UPDATE songs 
      SET audio_url = $1
      WHERE id = 8
      RETURNING id, title, audio_url AS "audioUrl"
    `, ['https://res.cloudinary.com/dui2htda9/video/upload/v1764942134/sitebestt_wz73mm.mp3']);
    
    res.json({ 
      success: true, 
      message: 'Delirium updated!',
      song: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

// Add image_url columns to shows and merch tables if they don't exist
app.post('/api/add-image-url-columns', async (req, res) => {
  try {
    await db.query(`ALTER TABLE shows ADD COLUMN IF NOT EXISTS image_url TEXT;`);
    await db.query(`ALTER TABLE merch ADD COLUMN IF NOT EXISTS image_url TEXT;`);
    res.json({ success: true, message: 'Image URL columns added' });
  } catch (error) {
    console.error('Error adding image URL columns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add audio_url column to songs table if it doesn't exist
app.post('/api/add-audio-url-column', async (req, res) => {
  try {
    // First check if column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    
    if (columnCheck.rows.length === 0) {
      await db.query(`
        ALTER TABLE songs 
        ADD COLUMN audio_url TEXT;
      `);
      res.json({ success: true, message: 'audio_url column added successfully' });
    } else {
      res.json({ success: true, message: 'audio_url column already exists' });
    }
  } catch (error) {
    console.error('Error adding audio_url column:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if audio_url column exists
app.get('/api/check-audio-url-column', async (req, res) => {
  try {
    const columnCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    
    res.json({ 
      exists: columnCheck.rows.length > 0,
      column: columnCheck.rows[0] || null
    });
  } catch (error) {
    console.error('Error checking column:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct update endpoint for Delirium song (GET version for easy browser access)
app.get('/api/update-delirium-audio', async (req, res) => {
  try {
    // First ensure column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    
    if (columnCheck.rows.length === 0) {
      await db.query(`ALTER TABLE songs ADD COLUMN audio_url TEXT;`);
      console.log('Added audio_url column');
    }
    
    // Update Delirium song
    const result = await db.query(`
      UPDATE songs 
      SET audio_url = $1
      WHERE LOWER(title) = LOWER('Delirium')
      RETURNING id, title, audio_url AS "audioUrl"
    `, ['https://res.cloudinary.com/dui2htda9/video/upload/v1764942134/sitebestt_wz73mm.mp3']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Delirium song not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Delirium audio URL updated',
      song: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating Delirium:', error);
    res.status(500).json({ success: false, error: error.message });
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
      'SELECT id, date, city, venue, location, price, available_seats AS "availableSeats", image_url AS "imageUrl" FROM shows ORDER BY date ASC'
    );
    console.log('Fetched shows, sample show imageUrl:', result.rows[0]?.imageUrl);
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
  const { userId, date, city, venue, location, price, availableSeats, imageUrl } = req.body || {};

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
      `INSERT INTO shows (date, city, venue, location, price, available_seats, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, date, city, venue, location, price, available_seats AS "availableSeats", image_url AS "imageUrl"`,
      [date, city, venue || null, location || null, price || null, availableSeats != null ? availableSeats : 30, imageUrl || null]
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
  const { userId, date, city, venue, location, price, availableSeats, imageUrl } = req.body || {};

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
    if (location !== undefined) {
      fields.push(`location = $${idx++}`);
      const finalLocation = (location && typeof location === 'string' && location.trim() !== '') ? location.trim() : null;
      values.push(finalLocation);
      console.log(`[UPDATE SHOW] Setting location for show ${showId} to:`, finalLocation);
    }
    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(price);
    }
    if (availableSeats !== undefined) {
      fields.push(`available_seats = $${idx++}`);
      values.push(availableSeats);
    }
    if (imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      const finalImageUrl = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : null;
      values.push(finalImageUrl);
      console.log(`[UPDATE SHOW] Setting imageUrl for show ${showId} to:`, finalImageUrl);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(showId);

    const query = `
      UPDATE shows
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, date, city, venue, location, price, available_seats AS "availableSeats", image_url AS "imageUrl"
    `;

    console.log('[UPDATE SHOW] Query:', query);
    console.log('[UPDATE SHOW] Values:', values);
    const result = await db.query(query, values);
    console.log('[UPDATE SHOW] Result:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'show not found' });
    }

    console.log('Updated show response:', result.rows[0]);
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
  const { userId, name, price, type, variant, availableQuantity, imageUrl } = req.body || {};

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
      `INSERT INTO merch (name, price, type, variant, available_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, price, type, variant, available_quantity AS "availableQuantity", image_url AS "imageUrl"`,
      [
        name,
        price,
        type || null,
        variant || null,
        availableQuantity != null ? availableQuantity : 20,
        imageUrl || null,
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
  const { userId, name, price, type, variant, availableQuantity, imageUrl } = req.body || {};

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
    if (imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(imageUrl || null);
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
      'SELECT id, name, price, type, variant, available_quantity AS "availableQuantity", image_url AS "imageUrl" FROM merch ORDER BY type ASC, id ASC'
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
    
    // Check if audio_url column exists first
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    
    const hasAudioUrl = columnCheck.rows.length > 0;
    
    // Check if lyrics column exists
    const lyricsColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='lyrics';
    `);
    const hasLyrics = lyricsColumnCheck.rows.length > 0;
    
    if (albumId) {
      if (hasAudioUrl && hasLyrics) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl", lyrics FROM songs WHERE album_id = $1 ORDER BY track_number ASC';
      } else if (hasAudioUrl) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl" FROM songs WHERE album_id = $1 ORDER BY track_number ASC';
      } else if (hasLyrics) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", lyrics FROM songs WHERE album_id = $1 ORDER BY track_number ASC';
      } else {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber" FROM songs WHERE album_id = $1 ORDER BY track_number ASC';
      }
      params = [albumId];
    } else {
      if (hasAudioUrl && hasLyrics) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl", lyrics FROM songs ORDER BY album_id ASC, track_number ASC';
      } else if (hasAudioUrl) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl" FROM songs ORDER BY album_id ASC, track_number ASC';
      } else if (hasLyrics) {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber", lyrics FROM songs ORDER BY album_id ASC, track_number ASC';
      } else {
        query = 'SELECT id, album_id AS "albumId", title, duration, track_number AS "trackNumber" FROM songs ORDER BY album_id ASC, track_number ASC';
      }
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
  const { userId, albumId, title, duration, trackNumber, audioUrl } = req.body || {};

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

    // Check if lyrics column exists
    const lyricsColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='lyrics';
    `);
    const hasLyrics = lyricsColumnCheck.rows.length > 0;
    
    let result;
    if (hasLyrics) {
      result = await db.query(
        `INSERT INTO songs (album_id, title, duration, track_number, audio_url, lyrics)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl", lyrics`,
        [albumId, title, duration, trackNumber, audioUrl || null, lyrics || null]
      );
    } else {
      result = await db.query(
        `INSERT INTO songs (album_id, title, duration, track_number, audio_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, album_id AS "albumId", title, duration, track_number AS "trackNumber", audio_url AS "audioUrl"`,
        [albumId, title, duration, trackNumber, audioUrl || null]
      );
    }

    res.status(201).json({ success: true, song: result.rows[0] });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ success: false, error: 'failed to create song' });
  }
});

// Admin: update an existing song
app.put('/api/admin/songs/:songId', async (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { userId, albumId, title, duration, trackNumber, audioUrl, lyrics } = req.body || {};

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
    if (audioUrl !== undefined) {
      fields.push(`audio_url = $${idx++}`);
      values.push(audioUrl || null);
      console.log(`Updating song ${songId} with audioUrl:`, audioUrl || null);
    }
    
    // Check if lyrics column exists and handle lyrics update
    const lyricsColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='lyrics';
    `);
    const hasLyrics = lyricsColumnCheck.rows.length > 0;
    
    // Handle lyrics update - allow empty string to clear lyrics
    if (lyrics !== undefined && hasLyrics) {
      fields.push(`lyrics = $${idx++}`);
      // Allow empty string to set lyrics to null (clear lyrics)
      values.push(lyrics === '' ? null : (lyrics || null));
      console.log(`Updating song ${songId} with lyrics:`, lyrics === '' ? 'null (clearing)' : lyrics);
    } else if (lyrics !== undefined && !hasLyrics) {
      // If lyrics column doesn't exist but lyrics is being sent, create it
      console.log('Lyrics column does not exist, creating it...');
      try {
        await db.query(`ALTER TABLE songs ADD COLUMN lyrics TEXT;`);
        fields.push(`lyrics = $${idx++}`);
        values.push(lyrics === '' ? null : (lyrics || null));
        console.log(`Lyrics column created and updating song ${songId} with lyrics`);
      } catch (alterError) {
        console.error('Error creating lyrics column:', alterError);
        // Continue without lyrics if column creation fails
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }

    values.push(songId);
    
    // Build RETURNING clause based on available columns
    let returningFields = 'id, album_id AS "albumId", title, duration, track_number AS "trackNumber"';
    if (hasLyrics) {
      returningFields += ', lyrics';
    }
    const audioColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    if (audioColumnCheck.rows.length > 0) {
      returningFields += ', audio_url AS "audioUrl"';
    }

    const query = `
      UPDATE songs
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING ${returningFields}
    `;

    console.log('Update query:', query);
    console.log('Update values:', values);
    const result = await db.query(query, values);
    console.log('Update result:', result.rows[0]);

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

// =========================
// PLAYLIST MANAGEMENT
// =========================

// Get all playlists (for logged-in users, show their own playlists)
app.get('/api/playlists', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    
    let query;
    let params;
    
    if (userId) {
      query = `
        SELECT p.id, p.user_id AS "userId", p.name, p.image_url AS "imageUrl", p.created_at AS "createdAt",
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', s.id,
                     'title', s.title,
                     'duration', s.duration,
                     'trackNumber', s.track_number,
                     'albumId', s.album_id,
                     'audioUrl', s.audio_url,
                     'lyrics', s.lyrics,
                     'position', ps.position
                   ) ORDER BY ps.position
                 ) FILTER (WHERE s.id IS NOT NULL),
                 '[]'::json
               ) AS songs
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        LEFT JOIN songs s ON ps.song_id = s.id
        WHERE p.user_id = $1
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT p.id, p.user_id AS "userId", p.name, p.image_url AS "imageUrl", p.created_at AS "createdAt",
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', s.id,
                     'title', s.title,
                     'duration', s.duration,
                     'trackNumber', s.track_number,
                     'albumId', s.album_id,
                     'audioUrl', s.audio_url,
                     'lyrics', s.lyrics,
                     'position', ps.position
                   ) ORDER BY ps.position
                 ) FILTER (WHERE s.id IS NOT NULL),
                 '[]'::json
               ) AS songs
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        LEFT JOIN songs s ON ps.song_id = s.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    
    // Parse the songs JSON for each playlist
    const playlists = result.rows.map(row => ({
      ...row,
      songs: typeof row.songs === 'string' ? JSON.parse(row.songs) : row.songs
    }));
    
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'failed to load playlists' });
  }
});

// Get all public playlists (for "Other Playlists" section) - MUST come before /:playlistId route
app.get('/api/playlists/public', async (req, res) => {
  try {
    const currentUserId = req.query.excludeUserId ? parseInt(req.query.excludeUserId, 10) : null;
    
    let query;
    let params;
    
    if (currentUserId) {
      query = `
        SELECT p.id, p.user_id AS "userId", p.name, p.image_url AS "imageUrl", p.created_at AS "createdAt",
               u.username, u.email,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', s.id,
                     'title', s.title,
                     'duration', s.duration,
                     'trackNumber', s.track_number,
                     'albumId', s.album_id,
                     'audioUrl', s.audio_url,
                     'lyrics', s.lyrics,
                     'position', ps.position
                   ) ORDER BY ps.position
                 ) FILTER (WHERE s.id IS NOT NULL),
                 '[]'::json
               ) AS songs
        FROM playlists p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        LEFT JOIN songs s ON ps.song_id = s.id
        WHERE COALESCE(p.is_public, false) = true AND p.user_id != $1
        GROUP BY p.id, u.username, u.email
        ORDER BY p.created_at DESC
      `;
      params = [currentUserId];
    } else {
      query = `
        SELECT p.id, p.user_id AS "userId", p.name, p.image_url AS "imageUrl", p.created_at AS "createdAt",
               u.username, u.email,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', s.id,
                     'title', s.title,
                     'duration', s.duration,
                     'trackNumber', s.track_number,
                     'albumId', s.album_id,
                     'audioUrl', s.audio_url,
                     'lyrics', s.lyrics,
                     'position', ps.position
                   ) ORDER BY ps.position
                 ) FILTER (WHERE s.id IS NOT NULL),
                 '[]'::json
               ) AS songs
        FROM playlists p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
        LEFT JOIN songs s ON ps.song_id = s.id
        WHERE COALESCE(p.is_public, false) = true
        GROUP BY p.id, u.username, u.email
        ORDER BY p.created_at DESC
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    
    // Parse the songs JSON for each playlist and group by username
    const playlists = result.rows.map(row => ({
      ...row,
      songs: typeof row.songs === 'string' ? JSON.parse(row.songs) : row.songs
    }));
    
    // Group playlists by username
    const playlistsByUser = {};
    playlists.forEach(playlist => {
      const username = playlist.username || playlist.email || 'Unknown';
      if (!playlistsByUser[username]) {
        playlistsByUser[username] = {
          username,
          email: playlist.email,
          playlists: []
        };
      }
      playlistsByUser[username].playlists.push(playlist);
    });
    
    res.json(Object.values(playlistsByUser));
  } catch (error) {
    console.error('Error fetching public playlists:', error);
    console.error('Error details:', error.message, error.code, error.stack);
    res.status(500).json({ 
      success: false,
      error: 'failed to load public playlists',
      details: error.message,
      code: error.code
    });
  }
});

// Get a single playlist by ID
app.get('/api/playlists/:playlistId', async (req, res) => {
  try {
    const playlistId = parseInt(req.params.playlistId, 10);
    
    const result = await db.query(`
      SELECT p.id, p.user_id AS "userId", p.name, p.image_url AS "imageUrl", p.created_at AS "createdAt",
             COALESCE(p.is_public, false) AS "isPublic",
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', s.id,
                   'title', s.title,
                   'duration', s.duration,
                   'trackNumber', s.track_number,
                   'albumId', s.album_id,
                   'audioUrl', s.audio_url,
                   'lyrics', s.lyrics,
                   'position', ps.position
                 ) ORDER BY ps.position
               ) FILTER (WHERE s.id IS NOT NULL),
               '[]'::json
             ) AS songs
      FROM playlists p
      LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
      LEFT JOIN songs s ON ps.song_id = s.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [playlistId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    const playlist = result.rows[0];
    playlist.songs = typeof playlist.songs === 'string' ? JSON.parse(playlist.songs) : playlist.songs;
    
    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ success: false, error: 'failed to load playlist' });
  }
});

// Create a new playlist
app.post('/api/playlists', async (req, res) => {
  const { userId, name, imageUrl } = req.body || {};
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'playlist name is required' });
  }
  
  try {
    const result = await db.query(
      `INSERT INTO playlists (user_id, name, image_url, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id AS "userId", name, image_url AS "imageUrl", created_at AS "createdAt", COALESCE(is_public, false) AS "isPublic"`,
      [userId, name.trim(), imageUrl || null, false]
    );
    
    res.status(201).json({ success: true, playlist: { ...result.rows[0], songs: [] } });
  } catch (error) {
    console.error('Error creating playlist:', error);
    console.error('Error details:', error.message, error.code);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'failed to create playlist',
      details: error.code === '42P01' ? 'Playlists table does not exist. Please restart the backend server.' : error.message
    });
  }
});

// Update a playlist
app.put('/api/playlists/:playlistId', async (req, res) => {
  const playlistId = parseInt(req.params.playlistId, 10);
  const { userId, name, imageUrl, isPublic } = req.body || {};
  
  console.log(`[UPDATE PLAYLIST] Received update request for playlist ${playlistId}:`, { 
    userId, 
    name, 
    imageUrl, 
    isPublic, 
    isPublicType: typeof isPublic,
    isPublicValue: isPublic 
  });
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  if (!playlistId) {
    return res.status(400).json({ success: false, error: 'playlistId is required' });
  }
  
  try {
    // Check if user owns the playlist
    const ownershipCheck = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    if (ownershipCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }
    
    const fields = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, error: 'playlist name cannot be empty' });
      }
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    
    if (imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(imageUrl || null);
    }
    
    // Always update isPublic if it's provided (even if false)
    if (isPublic !== undefined && isPublic !== null) {
      fields.push(`is_public = $${idx++}`);
      const isPublicValue = isPublic === true || isPublic === 'true' || isPublic === 1;
      values.push(isPublicValue);
      console.log(`[UPDATE PLAYLIST] Setting is_public for playlist ${playlistId} to:`, isPublicValue, '(from input:', isPublic, ')');
    } else {
      console.log(`[UPDATE PLAYLIST] isPublic is undefined/null, not updating is_public field`);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'no fields to update' });
    }
    
    values.push(playlistId);
    
    const query = `
      UPDATE playlists
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, user_id AS "userId", name, image_url AS "imageUrl", created_at AS "createdAt", COALESCE(is_public, false) AS "isPublic"
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    res.json({ success: true, playlist: result.rows[0] });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ success: false, error: 'failed to update playlist' });
  }
});

// Delete a playlist
app.delete('/api/playlists/:playlistId', async (req, res) => {
  const playlistId = parseInt(req.params.playlistId, 10);
  const { userId } = req.body || {};
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  if (!playlistId) {
    return res.status(400).json({ success: false, error: 'playlistId is required' });
  }
  
  try {
    // Check if user owns the playlist
    const ownershipCheck = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    if (ownershipCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }
    
    const result = await db.query(
      'DELETE FROM playlists WHERE id = $1 RETURNING id',
      [playlistId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ success: false, error: 'failed to delete playlist' });
  }
});

// Add a song to a playlist
app.post('/api/playlists/:playlistId/songs', async (req, res) => {
  const playlistId = parseInt(req.params.playlistId, 10);
  const { userId, songId, position } = req.body || {};
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  if (!songId) {
    return res.status(400).json({ success: false, error: 'songId is required' });
  }
  
  try {
    // Check if user owns the playlist
    const ownershipCheck = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    if (ownershipCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }
    
    // Check if song exists
    const songCheck = await db.query('SELECT id FROM songs WHERE id = $1', [songId]);
    if (songCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'song not found' });
    }
    
    // Check if song is already in playlist
    const existingCheck = await db.query(
      'SELECT id FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      [playlistId, songId]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'song already in playlist' });
    }
    
    // Get the next position if not provided
    let nextPosition = position;
    if (nextPosition === undefined || nextPosition === null) {
      const maxPositionResult = await db.query(
        'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM playlist_songs WHERE playlist_id = $1',
        [playlistId]
      );
      nextPosition = maxPositionResult.rows[0].next_pos;
    }
    
    const result = await db.query(
      `INSERT INTO playlist_songs (playlist_id, song_id, position)
       VALUES ($1, $2, $3)
       RETURNING id, playlist_id AS "playlistId", song_id AS "songId", position`,
      [playlistId, songId, nextPosition]
    );
    
    res.status(201).json({ success: true, playlistSong: result.rows[0] });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ success: false, error: 'failed to add song to playlist' });
  }
});

// Remove a song from a playlist
app.delete('/api/playlists/:playlistId/songs/:songId', async (req, res) => {
  const playlistId = parseInt(req.params.playlistId, 10);
  const songId = parseInt(req.params.songId, 10);
  const { userId } = req.body || {};
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  try {
    // Check if user owns the playlist
    const ownershipCheck = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    if (ownershipCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }
    
    const result = await db.query(
      'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      [playlistId, songId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'song not found in playlist' });
    }
    
    // Reorder remaining songs
    await db.query(`
      UPDATE playlist_songs
      SET position = new_pos
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS new_pos
        FROM playlist_songs
        WHERE playlist_id = $1
      ) AS reordered
      WHERE playlist_songs.id = reordered.id
    `, [playlistId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({ success: false, error: 'failed to remove song from playlist' });
  }
});

// Reorder songs in a playlist
app.put('/api/playlists/:playlistId/songs/reorder', async (req, res) => {
  const playlistId = parseInt(req.params.playlistId, 10);
  const { userId, songIds } = req.body || {}; // songIds is an array of song IDs in the new order
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  
  if (!Array.isArray(songIds)) {
    return res.status(400).json({ success: false, error: 'songIds must be an array' });
  }
  
  try {
    // Check if user owns the playlist
    const ownershipCheck = await db.query(
      'SELECT user_id FROM playlists WHERE id = $1',
      [playlistId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'playlist not found' });
    }
    
    if (ownershipCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'not authorized' });
    }
    
    // Update positions for each song
    for (let i = 0; i < songIds.length; i++) {
      await db.query(
        'UPDATE playlist_songs SET position = $1 WHERE playlist_id = $2 AND song_id = $3',
        [i + 1, playlistId, songIds[i]]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering songs:', error);
    res.status(500).json({ success: false, error: 'failed to reorder songs' });
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

// Automatically add audio_url and image_url columns on server start
(async () => {
  try {
    // Add audio_url column to songs
    const audioColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='audio_url';
    `);
    
    if (audioColumnCheck.rows.length === 0) {
      console.log('Adding audio_url column to songs table...');
      await db.query(`ALTER TABLE songs ADD COLUMN audio_url TEXT;`);
      console.log('✓ audio_url column added to songs table');
    } else {
      console.log('✓ audio_url column already exists');
    }
    
    // Add image_url column to shows
    const showsImageColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shows' AND column_name='image_url';
    `);
    
    if (showsImageColumnCheck.rows.length === 0) {
      console.log('Adding image_url column to shows table...');
      await db.query(`ALTER TABLE shows ADD COLUMN image_url TEXT;`);
      console.log('✓ image_url column added to shows table');
    } else {
      console.log('✓ image_url column already exists in shows table');
    }
    
    // Add location column to shows
    const locationColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shows' AND column_name='location';
    `);
    
    if (locationColumnCheck.rows.length === 0) {
      console.log('Adding location column to shows table...');
      await db.query(`ALTER TABLE shows ADD COLUMN location TEXT;`);
      console.log('✓ location column added to shows table');
    } else {
      console.log('✓ location column already exists in shows table');
    }
    
    // Add image_url column to merch
    const merchImageColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='merch' AND column_name='image_url';
    `);
    
    if (merchImageColumnCheck.rows.length === 0) {
      console.log('Adding image_url column to merch table...');
      await db.query(`ALTER TABLE merch ADD COLUMN image_url TEXT;`);
      console.log('✓ image_url column added to merch table');
    } else {
      console.log('✓ image_url column already exists in merch table');
    }
    
    // Add lyrics column to songs
    const lyricsColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='songs' AND column_name='lyrics';
    `);
    
    if (lyricsColumnCheck.rows.length === 0) {
      console.log('Adding lyrics column to songs table...');
      await db.query(`ALTER TABLE songs ADD COLUMN lyrics TEXT;`);
      console.log('✓ lyrics column added to songs table');
    } else {
      console.log('✓ lyrics column already exists in songs table');
    }
    
    // Create playlists table if it doesn't exist
    const playlistsTableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name='playlists';
    `);
    
    if (playlistsTableCheck.rows.length === 0) {
      console.log('Creating playlists table...');
      await db.query(`
        CREATE TABLE playlists (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ playlists table created');
    } else {
      console.log('✓ playlists table already exists');
    }
    
    // Create playlist_songs junction table if it doesn't exist
    const playlistSongsTableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name='playlist_songs';
    `);
    
    if (playlistSongsTableCheck.rows.length === 0) {
      console.log('Creating playlist_songs table...');
      await db.query(`
        CREATE TABLE playlist_songs (
          id SERIAL PRIMARY KEY,
          playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
          song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          UNIQUE(playlist_id, song_id)
        );
      `);
      console.log('✓ playlist_songs table created');
    } else {
      console.log('✓ playlist_songs table already exists');
    }
    
    // Add is_public column to playlists if it doesn't exist
    const isPublicColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='playlists' AND column_name='is_public';
    `);
    
    if (isPublicColumnCheck.rows.length === 0) {
      console.log('Adding is_public column to playlists table...');
      await db.query(`ALTER TABLE playlists ADD COLUMN is_public BOOLEAN DEFAULT false;`);
      console.log('✓ is_public column added to playlists table');
    } else {
      console.log('✓ is_public column already exists in playlists table');
    }
  } catch (error) {
    console.error('❌ Error checking/adding columns:', error.message);
    console.error('Full error:', error);
  }
})();

// Debug endpoint to check a specific song's data
app.get('/api/debug/song/:songId', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId, 10);
    const result = await db.query(
      'SELECT * FROM songs WHERE id = $1',
      [songId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ song: result.rows[0] });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

