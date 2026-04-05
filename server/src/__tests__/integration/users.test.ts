import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { userRoutes } from '../../routes/user.routes'
import { vi } from 'vitest'

vi.mock('../../db/client', () => ({
  db: {
    query: vi.fn(),
  },
}))

import { db } from '../../db/client'

let app: FastifyInstance

beforeAll(async () => {
  app = Fastify()
  await app.register(userRoutes)
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /users/:id', () => {
  it('returns 400 for invalid id', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/abc' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 } as never)
    const res = await app.inject({ method: 'GET', url: '/users/999' })
    expect(res.statusCode).toBe(404)
  })

  it('returns user profile', async () => {
    vi.mocked(db.query).mockResolvedValue({
      rows: [{ id: 1, email: 'a@b.com', name: 'Alice', avatar_url: null, mmr: 1200 }],
      rowCount: 1,
    } as never)
    const res = await app.inject({ method: 'GET', url: '/users/1' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('Alice')
    expect(body.mmr).toBe(1200)
  })
})

describe('GET /users/:id/history', () => {
  it('returns 400 for invalid id', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/abc/history' })
    expect(res.statusCode).toBe(400)
  })

  it('returns empty array when no history', async () => {
    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 } as never)
    const res = await app.inject({ method: 'GET', url: '/users/1/history' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual([])
  })

  it('returns tournament history', async () => {
    vi.mocked(db.query).mockResolvedValue({
      rows: [{
        tournamentId: 1,
        format: '5-player',
        place: 1,
        mmrChange: 25,
        finishedAt: '2026-04-01T12:00:00Z',
      }],
      rowCount: 1,
    } as never)
    const res = await app.inject({ method: 'GET', url: '/users/1/history' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body[0].mmrChange).toBe(25)
    expect(body[0].place).toBe(1)
  })
})
