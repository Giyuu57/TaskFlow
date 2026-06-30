const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing in Vercel environment variables');
}

const sql = neon(databaseUrl);

module.exports = { sql };