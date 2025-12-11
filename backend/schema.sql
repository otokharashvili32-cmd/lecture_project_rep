-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))
);

-- Shows table
CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  city TEXT NOT NULL,
  venue TEXT,
  location TEXT,
  price NUMERIC(10, 2),
  available_seats INT DEFAULT 30 CHECK (available_seats >= 0)
);

-- Merch table
CREATE TABLE IF NOT EXISTS merch (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  type TEXT,
  variant TEXT,
  available_quantity INT DEFAULT 20 CHECK (available_quantity >= 0)
);

-- Albums (discography) table
CREATE TABLE IF NOT EXISTS albums (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INT,
  cover_image TEXT
);

-- User show reservations (which users reserved which shows)
CREATE TABLE IF NOT EXISTS user_show_reservations (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, show_id)
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  album_id INT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  track_number INT NOT NULL,
  audio_url TEXT,
  UNIQUE (album_id, track_number)
);

-- User song likes table
CREATE TABLE IF NOT EXISTS user_song_likes (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- Song ratings table
CREATE TABLE IF NOT EXISTS song_ratings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id INT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, song_id)
);

-- User show purchases table
CREATE TABLE IF NOT EXISTS user_show_purchases (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, show_id)
);

-- User merch wishlist table
CREATE TABLE IF NOT EXISTS user_merch_wishlist (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merch_id INT NOT NULL REFERENCES merch(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, merch_id)
);

-- User merch purchases table
CREATE TABLE IF NOT EXISTS user_merch_purchases (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merch_id INT NOT NULL REFERENCES merch(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, merch_id)
);

-- Visitor counter table
CREATE TABLE IF NOT EXISTS visitor_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count INTEGER DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO visitor_counter (id, count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
