import { describe, it, expect } from 'vitest'
import { createShuffledDeck, cardToString } from '../../game/deck'

describe('deck', () => {
  it('creates 52 cards', () => {
    const deck = createShuffledDeck()
    expect(deck).toHaveLength(52)
  })

  it('has no duplicate cards', () => {
    const deck = createShuffledDeck()
    const strings = deck.map(cardToString)
    const unique = new Set(strings)
    expect(unique.size).toBe(52)
  })

  it('contains all suits and ranks', () => {
    const deck = createShuffledDeck()
    const suits = new Set(deck.map(c => c.suit))
    const ranks = new Set(deck.map(c => c.rank))
    expect(suits).toEqual(new Set(['s', 'h', 'd', 'c']))
    expect(ranks.size).toBe(13)
  })

  it('is shuffled (not sorted)', () => {
    const deck1 = createShuffledDeck()
    const deck2 = createShuffledDeck()
    const str1 = deck1.map(cardToString).join('')
    const str2 = deck2.map(cardToString).join('')
    // Extremely unlikely to be identical
    expect(str1).not.toBe(str2)
  })

  it('cardToString formats correctly', () => {
    expect(cardToString({ rank: 'A', suit: 's' })).toBe('As')
    expect(cardToString({ rank: 'T', suit: 'h' })).toBe('Th')
    expect(cardToString({ rank: '2', suit: 'd' })).toBe('2d')
  })
})
