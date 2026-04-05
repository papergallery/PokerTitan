import { FastifyInstance } from 'fastify';
import * as matchmakingService from '../matchmaking/matchmaking.service';
import { getUserById } from '../auth/auth.service';

const COOKIE_NAME = 'token';

export async function matchmakingRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { format: '1v1' | '5-player' } }>(
    '/matchmaking/join',
    async (req, reply) => {
      const token = req.cookies[COOKIE_NAME];
      if (!token) return reply.code(401).send({ error: 'Not authenticated' });

      let userId: number;
      try {
        const payload = app.jwt.verify<{ id: number }>(token);
        userId = payload.id;
      } catch {
        return reply.code(401).send({ error: 'Invalid token' });
      }

      const { format } = req.body;
      if (format !== '1v1' && format !== '5-player') {
        return reply.code(400).send({ error: 'Invalid format' });
      }

      const user = await getUserById(userId);
      if (!user) return reply.code(404).send({ error: 'User not found' });

      matchmakingService.joinQueue(
        { userId, mmr: user.mmr, joinedAt: new Date(), socketId: '' },
        format
      );

      return { ok: true };
    }
  );

  app.post('/matchmaking/leave', async (req, reply) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return reply.code(401).send({ error: 'Not authenticated' });

    let userId: number;
    try {
      const payload = app.jwt.verify<{ id: number }>(token);
      userId = payload.id;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }

    matchmakingService.leaveAllQueues(userId);
    return { ok: true };
  });
}
