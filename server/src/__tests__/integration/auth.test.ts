import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import { authRoutes } from '../../auth/auth.routes'

// Mock the DB calls
import * as authService from '../../auth/auth.service'
import { vi } from 'vitest'

vi.mock('../../auth/auth.service')

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  mmr: 1000,
}

let app: FastifyInstance

beforeAll(async () => {
  app = Fastify()
  await app.register(fastifyCookie)
  await app.register(fastifyJwt, { secret: 'test-secret-32-chars-minimum-ok' })
  await app.register(authRoutes)
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /auth/register', () => {
  it('returns 400 if fields missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { email: 'test@example.com' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body)).toHaveProperty('error')
  })

  it('creates user and sets cookie on success', async () => {
    vi.mocked(authService.register).mockResolvedValue(mockUser)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { email: 'test@example.com', password: 'password123', name: 'Test User' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.user.email).toBe('test@example.com')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 400 if email already in use', async () => {
    vi.mocked(authService.register).mockRejectedValue(new Error('Email already in use'))
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { email: 'test@example.com', password: 'password123', name: 'Test' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toBe('Email already in use')
  })
})

describe('POST /auth/login', () => {
  it('returns 400 if fields missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'test@example.com' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 401 for invalid credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'test@example.com', password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('sets cookie and returns user on success', async () => {
    vi.mocked(authService.login).mockResolvedValue(mockUser)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'test@example.com', password: 'correct' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.user.id).toBe(1)
    expect(res.headers['set-cookie']).toBeDefined()
  })
})

describe('GET /auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns user with valid token', async () => {
    vi.mocked(authService.getUserById).mockResolvedValue(mockUser)
    const token = app.jwt.sign({ id: 1, email: 'test@example.com' })
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { token },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(1)
  })
})

describe('POST /auth/logout', () => {
  it('clears cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toBeDefined()
  })
})
