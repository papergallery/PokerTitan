import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { runMigrations } from './db/migrations';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './routes/user.routes';
import { initSocketHandler } from './socket/socket.handler';
import { statsRoutes } from './routes/stats.routes';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET must be set in environment and be at least 32 characters long');
  process.exit(1);
}

async function main() {
  const app = Fastify({ logger: true });

  await app.register(fastifyCors, {
    origin: CLIENT_URL,
    credentials: true,
  });

  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: JWT_SECRET as string,
    // Tokens expire after 7 days — keeps replay window bounded if a token
    // ever leaks (logs, debug dump, etc.). Matches the cookie maxAge.
    sign: { expiresIn: '7d' },
  });

  await app.register(fastifyRateLimit, {
    global: false,
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const callbackUri =
      process.env.OAUTH_CALLBACK_URL ?? `http://localhost:${PORT}/auth/google/callback`;
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
      callbackUri,
    });
  } else {
    // Stub route when Google credentials are not configured
    app.get('/auth/google', async (_req, reply) => {
      return reply.code(503).send({ error: 'Google OAuth is not configured on this server' });
    });
  }

  await app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // Static serving for uploaded avatars (production usually goes via nginx, but
  // we register it here so dev / standalone deploys work without extra setup).
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../../uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  const io = new SocketIOServer(app.server, {
    cors: { origin: CLIENT_URL, credentials: true },
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(statsRoutes(io));

  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  await app.ready();

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
