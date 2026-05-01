import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { db } from '../db/client';
import { getOnlineStats, clearAllGames } from '../socket/socket.handler';

const COOKIE_NAME = 'token';

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

export function statsRoutes(io: SocketIOServer) {
  return async function (app: FastifyInstance): Promise<void> {
    // Public endpoint — no auth required
    app.get('/stats/online', async () => {
      return getOnlineStats(io);
    });

    // Admin: clear all in-memory game sessions
    app.post('/admin/clear-games', async (req: FastifyRequest, reply: FastifyReply) => {
      const token = req.cookies[COOKIE_NAME];
      if (!token) return reply.code(401).send({ error: 'Not authenticated' });
      let userId: number;
      try {
        const payload = app.jwt.verify<{ id: number; email: string }>(token);
        userId = payload.id;
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }
      const adminCheck = await db.query<{ is_admin: boolean }>(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      clearAllGames();
      // Mark forcibly stopped tournaments as `cancelled` (not `finished`)
      // so they don't pollute history/stats — those queries filter on
      // status='finished'.
      await db.query("UPDATE tournaments SET status = 'cancelled', finished_at = NOW() WHERE status NOT IN ('finished', 'cancelled')");
      return { cleared: true };
    });

    // Leaderboard — top players by MMR, paginated by 100
    app.get('/stats/leaderboard', async (req: FastifyRequest<{ Querystring: { page?: string } }>) => {
      const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
      const limit = 100;
      const offset = (page - 1) * limit;

      const countResult = await db.query<{ count: string }>('SELECT COUNT(*) FROM users');
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await db.query<{
        id: number;
        name: string;
        mmr: number;
        avatar_url: string | null;
        is_premium: boolean;
      }>(
        'SELECT id, name, mmr, avatar_url, is_premium FROM users ORDER BY mmr DESC, id ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return {
        players: result.rows.map((row, i) => ({
          rank: offset + i + 1,
          userId: row.id,
          name: row.name,
          mmr: row.mmr,
          avatarUrl: row.avatar_url,
          isPremium: row.is_premium,
        })),
        page,
        totalPages: Math.ceil(total / limit),
        total,
      };
    });
  };
}
