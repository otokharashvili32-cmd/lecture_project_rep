const { Pool } = require('pg');

// Read connection string from environment variable
// IMPORTANT: Put your Neon connection string into .env as DATABASE_URL
//
// Example .env (do NOT commit real secrets to Git):
// DATABASE_URL=postgresql://neondb_owner:password@host/dbname?sslmode=require
//
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    'DATABASE_URL is not set. Please add it to your .env file to enable database access.'
  );
}

const pool = new Pool({
  connectionString,
  // Neon requires SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};


