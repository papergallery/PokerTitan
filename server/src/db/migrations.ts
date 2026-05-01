import { db } from './client';

export async function runMigrations(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      password_hash TEXT,
      google_id VARCHAR(255) UNIQUE,
      mmr INTEGER DEFAULT 1000 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id SERIAL PRIMARY KEY,
      status VARCHAR(20) DEFAULT 'waiting' NOT NULL,
      format VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      started_at TIMESTAMP,
      finished_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournament_players (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER REFERENCES tournaments(id),
      user_id INTEGER REFERENCES users(id),
      place INTEGER,
      mmr_change INTEGER,
      UNIQUE(tournament_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS game_states (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER UNIQUE REFERENCES tournaments(id),
      state JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;
    CREATE INDEX IF NOT EXISTS users_mmr_idx ON users (mmr DESC, id ASC);
  `);
  // One-time backfill: the project previously hardcoded id=1 as admin.
  // Promote that account if it exists and no admin has been set yet.
  await db.query(`
    UPDATE users SET is_admin = TRUE
    WHERE id = 1 AND is_admin = FALSE
      AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE)
  `);
  console.log('Migrations completed');
}
