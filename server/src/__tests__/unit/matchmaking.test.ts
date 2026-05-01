import { describe, it, expect, beforeEach } from 'vitest'
import {
  joinQueue,
  leaveQueue,
  leaveAllQueues,
  tryMatch,
  QueueEntry,
} from '../../matchmaking/matchmaking.service'

function makeEntry(userId: number, mmr: number): QueueEntry {
  return { userId, mmr, joinedAt: new Date(), socketId: `socket-${userId}` }
}

// Reset module state between tests by clearing queues manually
beforeEach(() => {
  leaveAllQueues(1)
  leaveAllQueues(2)
  leaveAllQueues(3)
  leaveAllQueues(4)
  leaveAllQueues(5)
  leaveAllQueues(6)
})

describe('joinQueue / leaveQueue', () => {
  it('adds player to queue', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    const match = tryMatch('1v1')
    // Only 1 player, no match yet
    expect(match).toBeNull()
  })

  it('prevents duplicate entries', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(2, 1050), '1v1')
    const match = tryMatch('1v1')
    expect(match).not.toBeNull()
    expect(match).toHaveLength(2)
  })

  it('removes player from queue', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(2, 1050), '1v1')
    leaveQueue(1, '1v1')
    const match = tryMatch('1v1')
    expect(match).toBeNull()
  })
})

describe('tryMatch - 1v1', () => {
  it('returns null with only 1 player', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    expect(tryMatch('1v1')).toBeNull()
  })

  it('matches 2 players with close MMR', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(2, 1100), '1v1')
    const match = tryMatch('1v1')
    expect(match).not.toBeNull()
    expect(match).toHaveLength(2)
  })

  it('does not match players with MMR difference > 200', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(2, 1300), '1v1')
    const match = tryMatch('1v1')
    expect(match).toBeNull()
  })

  it('removes matched players from queue', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(2, 1050), '1v1')
    tryMatch('1v1')
    // Queue should be empty now
    joinQueue(makeEntry(3, 1000), '1v1')
    expect(tryMatch('1v1')).toBeNull()
  })

  it('expands MMR range for long waiters', () => {
    const longWaiter = makeEntry(1, 1000)
    longWaiter.joinedAt = new Date(Date.now() - 35_000) // 35 seconds ago
    joinQueue(longWaiter, '1v1')
    joinQueue(makeEntry(2, 1400), '1v1') // 400 MMR diff - normally blocked
    const match = tryMatch('1v1')
    expect(match).not.toBeNull()
  })
})

describe('tryMatch - 5-player', () => {
  it('returns null with fewer than 5 players', () => {
    for (let i = 1; i <= 4; i++) {
      joinQueue(makeEntry(i, 1000 + i * 10), '5-player')
    }
    expect(tryMatch('5-player')).toBeNull()
  })

  it('matches 5 players with close MMR', () => {
    for (let i = 1; i <= 5; i++) {
      joinQueue(makeEntry(i, 1000 + i * 10), '5-player')
    }
    const match = tryMatch('5-player')
    expect(match).not.toBeNull()
    expect(match).toHaveLength(5)
  })
})

describe('format validation (defense in depth)', () => {
  it('throws on unknown format from joinQueue', () => {
    // @ts-expect-error — testing runtime defense against arbitrary input
    expect(() => joinQueue(makeEntry(1, 1000), 'fake-format')).toThrow()
  })

  it('throws on unknown format from leaveQueue', () => {
    // @ts-expect-error — testing runtime defense against arbitrary input
    expect(() => leaveQueue(1, 'fake-format')).toThrow()
  })

  it('throws on unknown format from tryMatch', () => {
    // @ts-expect-error — testing runtime defense against arbitrary input
    expect(() => tryMatch('fake-format')).toThrow()
  })
})

describe('leaveAllQueues', () => {
  it('removes player from both queues', () => {
    joinQueue(makeEntry(1, 1000), '1v1')
    joinQueue(makeEntry(1, 1000), '5-player')
    leaveAllQueues(1)
    joinQueue(makeEntry(2, 1050), '1v1')
    expect(tryMatch('1v1')).toBeNull()
  })
})
