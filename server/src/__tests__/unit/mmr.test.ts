import { describe, it, expect } from 'vitest'
import { calculateMMRChanges } from '../../game/mmr'

describe('calculateMMRChanges - 5-player', () => {
  const places = [
    { userId: 1, place: 1 },
    { userId: 2, place: 2 },
    { userId: 3, place: 3 },
    { userId: 4, place: 4 },
    { userId: 5, place: 5 },
  ]

  it('gives correct MMR for each place', () => {
    const result = calculateMMRChanges(places, '5-player')
    expect(result.find(r => r.userId === 1)?.mmrChange).toBe(25)
    expect(result.find(r => r.userId === 2)?.mmrChange).toBe(10)
    expect(result.find(r => r.userId === 3)?.mmrChange).toBe(-5)
    expect(result.find(r => r.userId === 4)?.mmrChange).toBe(-15)
    expect(result.find(r => r.userId === 5)?.mmrChange).toBe(-25)
  })

  it('top 2 gain MMR, bottom 3 lose MMR', () => {
    const result = calculateMMRChanges(places, '5-player')
    const gainers = result.filter(r => r.mmrChange > 0)
    const losers = result.filter(r => r.mmrChange < 0)
    expect(gainers).toHaveLength(2)
    expect(losers).toHaveLength(3)
  })

  it('returns result for all players', () => {
    const result = calculateMMRChanges(places, '5-player')
    expect(result).toHaveLength(5)
  })
})

describe('calculateMMRChanges - 1v1', () => {
  const places = [
    { userId: 1, place: 1 },
    { userId: 2, place: 2 },
  ]

  it('winner gets +20, loser gets -20', () => {
    const result = calculateMMRChanges(places, '1v1')
    expect(result.find(r => r.userId === 1)?.mmrChange).toBe(20)
    expect(result.find(r => r.userId === 2)?.mmrChange).toBe(-20)
  })

  it('zero-sum in 1v1', () => {
    const result = calculateMMRChanges(places, '1v1')
    const total = result.reduce((sum, r) => sum + r.mmrChange, 0)
    expect(total).toBe(0)
  })
})
