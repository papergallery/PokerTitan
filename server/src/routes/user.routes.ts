import { FastifyInstance } from 'fastify';
import { db } from '../db/client';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' });

    const result = await db.query(
      'SELECT id, email, name, avatar_url, mmr FROM users WHERE id = $1',
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
}
