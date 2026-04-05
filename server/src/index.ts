import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyOauth2 from '@fastify/oauth2';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { runMigrations } from './db/migrations';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './routes/user.routes';
import { matchmakingRoutes } from './routes/matchmaking.routes';
import { initSocketHandler } from './socket/socket.handler';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(fastifyCors, {
    origin: CLIENT_URL,
    credentials: true,
  });

  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'changeme-use-a-real-secret',
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    await app.register(fastifyOauth2, {
      name: 'googleOAuth2',
      scope: ['profile', 'email'],
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: fastifyOauth2.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/auth/google',
      callbackUri: `http://localhost:${PORT}/auth/google/callback`,
    });
  } else {
    // Stub route when Google credentials are not configured
    app.get('/auth/google', async (_req, reply) => {
      return reply.code(503).send({ error: 'Google OAuth is not configured on this server' });
    });
  }

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(matchmakingRoutes);

  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  await app.ready();

  const io = new SocketIOServer(app.server, {
    cors: { origin: CLIENT_URL, credentials: true },
  });

  initSocketHandler(io, app);

  await runMigrations();

  await new Promise<void>((resolve, reject) => {
    app.server.listen(PORT, '0.0.0.0', (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log(`Server running on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
