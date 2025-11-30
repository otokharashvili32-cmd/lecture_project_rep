-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shows table
CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  city TEXT NOT NULL,
  venue TEXT
);

-- Merch table
CREATE TABLE IF NOT EXISTS merch (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL
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


