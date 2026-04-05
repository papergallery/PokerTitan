import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });

    const result = await db.query(
      'SELECT id, email, name, avatar_url as "avatarUrl", mmr FROM users WHERE id = $1',
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

  app.put<{ Body: { name: string } }>('/users/me', async (req, reply) => {
    const userId = await authenticate(app, req, reply);
    if (!userId) return;

    const { name } = req.body;
    if (!name || name.trim().length < 2 || name.trim().length > 32) {
      return reply.code(400).send({ error: 'Name must be 2–32 characters' });
    }

    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, avatar_url as "avatarUrl", mmr',
      [name.trim(), userId]
    );
    return result.rows[0];
  });

  app.post('/users/me/avatar', async (req, reply) => {
    const userId = await authenticate(app, req, reply);
    if (!userId) return;

    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'No file provided' });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(data.mimetype)) {
      return reply.code(400).send({ error: 'Only JPEG, PNG, WebP and GIF are allowed' });
    }

    const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${userId}-${crypto.randomUUID()}.${ext}`;
    const uploadsDir = path.join(__dirname, '../../../uploads/avatars');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, await data.toBuffer());

    const avatarUrl = `/uploads/avatars/${filename}`;
    const result = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, email, name, avatar_url as "avatarUrl", mmr',
      [avatarUrl, userId]
    );
    return result.rows[0];
  });
}
