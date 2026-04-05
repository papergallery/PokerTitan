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
  console.log('Migrations completed');
}
