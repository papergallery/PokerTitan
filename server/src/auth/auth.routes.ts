import { FastifyInstance, FastifyRequest } from 'fastify';
import * as authService from './auth.service';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const IS_PROD = process.env.NODE_ENV === 'production';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 32;

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

function validateRegisterInput(
  email: unknown,
  password: unknown,
  name: unknown
): string | null {
  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    return 'email, password and name are required';
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return 'Invalid email';
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters`;
  }
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
    return `Name must be ${MIN_NAME_LENGTH}–${MAX_NAME_LENGTH} characters`;
  }
  return null;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Rate limit: 10 attempts per IP per 15 minutes for register/login.
  const authLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
      },
    },
  };

  app.post<{ Body: { email: string; password: string; name: string } }>(
    '/auth/register',
    authLimit,
    async (req, reply) => {
      const { email, password, name } = req.body ?? ({} as { email?: string; password?: string; name?: string });
      const validationError = validateRegisterInput(email, password, name);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }
      try {
        const user = await authService.register(email.toLowerCase(), password, name.trim());
        const token = app.jwt.sign({ id: user.id, email: user.email });
        reply.setCookie(COOKIE_NAME, token, authCookieOptions());
        return { user };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        return reply.code(400).send({ error: message });
      }
    }
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    authLimit,
    async (req, reply) => {
      const { email, password } = req.body ?? ({} as { email?: string; password?: string });
      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return reply.code(400).send({ error: 'email and password are required' });
      }
      const user = await authService.login(email.toLowerCase(), password);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      const token = app.jwt.sign({ id: user.id, email: user.email });
      reply.setCookie(COOKIE_NAME, token, authCookieOptions());
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
      reply.setCookie(COOKIE_NAME, token, authCookieOptions());
      return reply.redirect(`${CLIENT_URL}/lobby`);
    } catch {
      return reply.redirect(`${CLIENT_URL}/login?error=oauth`);
    }
  });
}
