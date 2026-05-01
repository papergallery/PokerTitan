import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 4096;
const AVATAR_OUTPUT_SIZE = 512;

const COOKIE_NAME = 'token';

async function authenticate(app: FastifyInstance, req: FastifyRequest, reply: FastifyReply): Promise<number | null> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    reply.code(401).send({ error: 'Not authenticated' });
    return null;
  }
  try {
    const payload = app.jwt.verify<{ id: number; email: string }>(token);
    return payload.id;
  } catch {
    reply.code(401).send({ error: 'Invalid token' });
    return null;
  }
}

async function authenticatePremium(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
): Promise<number | null> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    reply.code(401).send({ error: 'Not authenticated' });
    return null;
  }
  let userId: number;
  try {
    const payload = app.jwt.verify<{ id: number; email: string }>(token);
    userId = payload.id;
  } catch {
    reply.code(401).send({ error: 'Invalid token' });
    return null;
  }

  const result = await db.query<{ is_premium: boolean }>(
    'SELECT is_premium FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    reply.code(401).send({ error: 'User not found' });
    return null;
  }
  if (!result.rows[0].is_premium) {
    reply.code(403).send({ error: 'Premium required' });
    return null;
  }

  return userId;
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });

    // Public endpoint — never leak email of other users
    const result = await db.query(
      'SELECT id, name, avatar_url as "avatarUrl", mmr, is_premium as "isPremium" FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'User not found' });
    return result.rows[0];
  });

  app.get<{ Params: { id: string } }>('/users/:id/history', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });

    const result = await db.query(
      `SELECT
         tp.tournament_id as "tournamentId",
         t.format,
         tp.place,
         tp.mmr_change as "mmrChange",
         t.finished_at as "finishedAt"
       FROM tournament_players tp
       JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.user_id = $1 AND t.status = 'finished'
       ORDER BY t.finished_at DESC
       LIMIT 50`,
      [id]
    );
    return result.rows;
  });

  app.get<{ Params: { id: string } }>('/users/:id/stats', async (req, reply) => {
    const premiumUserId = await authenticatePremium(app, req, reply);
    if (!premiumUserId) return;

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });

    // Get total games and wins
    const countsResult = await db.query<{ total: string; wins: string }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE place = 1) as wins
       FROM tournament_players tp
       JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.user_id = $1 AND t.status = 'finished'`,
      [id]
    );

    const totalGames = parseInt(countsResult.rows[0].total, 10);
    const wins = parseInt(countsResult.rows[0].wins, 10);
    const winRate = totalGames > 0
      ? Math.round((wins / totalGames) * 1000) / 10
      : 0;

    // Get current MMR
    const userResult = await db.query<{ mmr: number }>(
      'SELECT mmr FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    const currentMmr = userResult.rows[0].mmr;

    // Get MMR change history ordered by time ASC
    const historyResult = await db.query<{ mmr_change: number; finished_at: string }>(
      `SELECT tp.mmr_change, t.finished_at
       FROM tournament_players tp
       JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.user_id = $1 AND t.finished_at IS NOT NULL
       ORDER BY t.finished_at ASC`,
      [id]
    );

    // Reconstruct MMR history: start from (current - sum_of_all_changes), then add each change
    const totalChange = historyResult.rows.reduce((sum, row) => sum + row.mmr_change, 0);
    let runningMmr = currentMmr - totalChange;

    const mmrHistory: Array<{ mmr: number; date: string }> = [];
    for (const row of historyResult.rows) {
      runningMmr += row.mmr_change;
      mmrHistory.push({
        mmr: runningMmr,
        date: row.finished_at,
      });
    }

    return {
      totalGames,
      wins,
      winRate,
      mmrHistory,
    };
  });

  app.put<{ Body: { name: string } }>('/users/me', async (req, reply) => {
    const userId = await authenticate(app, req, reply);
    if (!userId) return;

    const { name } = req.body;
    if (!name || name.trim().length < 2 || name.trim().length > 32) {
      return reply.code(400).send({ error: 'Name must be 2–32 characters' });
    }

    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, avatar_url as "avatarUrl", mmr, is_premium as "isPremium"',
      [name.trim(), userId]
    );
    return result.rows[0];
  });

  app.post('/users/me/avatar', async (req, reply) => {
    const userId = await authenticate(app, req, reply);
    if (!userId) return;

    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'No file provided' });

    const buffer = await data.toBuffer();
    if (buffer.length > AVATAR_MAX_BYTES) {
      return reply.code(413).send({ error: 'Avatar must be 5 MB or less' });
    }

    // Process the upload via sharp:
    //  - parses the image structurally (rejects garbage / non-images),
    //  - protects against image bombs by checking dimensions before decode,
    //  - re-encodes to JPEG which strips EXIF and any embedded metadata,
    //  - normalizes orientation and size so all avatars are uniform.
    let processed: Buffer;
    try {
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height) {
        return reply.code(400).send({ error: 'Invalid image' });
      }
      if (meta.width > AVATAR_MAX_DIMENSION || meta.height > AVATAR_MAX_DIMENSION) {
        return reply.code(400).send({
          error: `Image dimensions too large (max ${AVATAR_MAX_DIMENSION}×${AVATAR_MAX_DIMENSION})`,
        });
      }
      processed = await sharp(buffer)
        .rotate() // honor EXIF orientation before stripping
        .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      return reply.code(400).send({ error: 'Invalid image file' });
    }

    const filename = `${userId}-${crypto.randomUUID()}.jpg`;
    const uploadsDir = path.join(__dirname, '../../../uploads/avatars');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, processed);

    // Best-effort cleanup of the previous avatar to stop unbounded disk growth.
    const prev = await db.query<{ avatar_url: string | null }>(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );
    const prevUrl = prev.rows[0]?.avatar_url;
    if (prevUrl && prevUrl.startsWith('/uploads/avatars/')) {
      const prevName = path.basename(prevUrl);
      // Only delete files matching our naming scheme `{userId}-{uuid}.{ext}`
      if (prevName.startsWith(`${userId}-`)) {
        const prevPath = path.join(uploadsDir, prevName);
        fs.promises.unlink(prevPath).catch(() => {});
      }
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    const result = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, email, name, avatar_url as "avatarUrl", mmr, is_premium as "isPremium"',
      [avatarUrl, userId]
    );
    return result.rows[0];
  });
}
