import { FastifyInstance, FastifyRequest } from 'fastify';
import * as authService from './auth.service';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email: string; password: string; name: string } }>(
    '/auth/register',
    async (req, reply) => {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return reply.code(400).send({ error: 'email, password and name are required' });
      }
      try {
        const user = await authService.register(email, password, name);
        const token = app.jwt.sign({ id: user.id, email: user.email });
        reply.setCookie(COOKIE_NAME, token, { httpOnly: true, maxAge: COOKIE_MAX_AGE, path: '/' });
        return { user };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        return reply.code(400).send({ error: message });
      }
    }
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    async (req, reply) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.code(400).send({ error: 'email and password are required' });
      }
      const user = await authService.login(email, password);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      const token = app.jwt.sign({ id: user.id, email: user.email });
      reply.setCookie(COOKIE_NAME, token, { httpOnly: true, maxAge: COOKIE_MAX_AGE, path: '/' });
      return { user };
    }
  );

  app.get('/auth/me', async (req, reply) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return reply.code(401).send({ error: 'Not authenticated' });
    try {
      const payload = app.jwt.verify<{ id: number; email: string }>(token);
      const user = await authService.getUserById(payload.id);
      if (!user) return reply.code(401).send({ error: 'User not found' });
      return user;
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  // Google OAuth — handled via @fastify/oauth2 plugin registered in index.ts
  app.get('/auth/google/callback', async (req, reply) => {
    try {
      const tokenResponse = await (app as FastifyInstance & {
        googleOAuth2: { getAccessTokenFromAuthorizationCodeFlow: (req: FastifyRequest) => Promise<{ token: { access_token: string } }> }
      }).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);

      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.token.access_token}` },
      });
      const profile = await res.json() as { id: string; email: string; name: string; picture?: string };

      const user = await authService.findOrCreateGoogleUser({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      const token = app.jwt.sign({ id: user.id, email: user.email });
      reply.setCookie(COOKIE_NAME, token, { httpOnly: true, maxAge: COOKIE_MAX_AGE, path: '/' });
      return reply.redirect(process.env.CLIENT_URL + '/lobby');
    } catch {
      return reply.redirect(process.env.CLIENT_URL + '/login?error=oauth');
    }
  });
}
