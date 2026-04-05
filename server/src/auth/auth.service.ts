import bcrypt from 'bcrypt';
import { db } from '../db/client';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  mmr: number;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<UserRecord> {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('Email already in use');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.query<UserRecord>(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, avatar_url as "avatarUrl", mmr`,
    [email, name, passwordHash]
  );
  return result.rows[0];
}

export async function login(
  email: string,
  password: string
): Promise<UserRecord | null> {
  const result = await db.query(
    'SELECT id, email, name, avatar_url as "avatarUrl", mmr, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  if (!user.password_hash) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, mmr: user.mmr };
}

export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}): Promise<UserRecord> {
  const byGoogle = await db.query<UserRecord>(
    'SELECT id, email, name, avatar_url as "avatarUrl", mmr FROM users WHERE google_id = $1',
    [profile.googleId]
  );
  if (byGoogle.rows.length > 0) return byGoogle.rows[0];

  const byEmail = await db.query(
    'SELECT id, email, name, avatar_url as "avatarUrl", mmr FROM users WHERE email = $1',
    [profile.email]
  );
  if (byEmail.rows.length > 0) {
    await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [
      profile.googleId,
      byEmail.rows[0].id,
    ]);
    return byEmail.rows[0];
  }

  const result = await db.query<UserRecord>(
    `INSERT INTO users (email, name, google_id, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, avatar_url as "avatarUrl", mmr`,
    [profile.email, profile.name, profile.googleId, profile.avatarUrl ?? null]
  );
  return result.rows[0];
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  const result = await db.query<UserRecord>(
    'SELECT id, email, name, avatar_url as "avatarUrl", mmr FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}
