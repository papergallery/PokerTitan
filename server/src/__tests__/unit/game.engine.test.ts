import { describe, it, expect } from 'vitest'
import {
  createGameState,
  processAction,
  advanceStage,
  determineWinner,
  isBettingRoundOver,
  isHandOver,
} from '../../game/game.engine'

const players = [
  { userId: 1 },
  { userId: 2 },
]

describe('createGameState', () => {
  it('initializes with correct number of players', () => {
    const state = createGameState(1, players)
    expect(state.players).toHaveLength(2)
  })

  it('deals 2 cards to each player', () => {
    const state = createGameState(1, players)
    for (const p of state.players) {
      expect(p.cards).toHaveLength(2)
    }
  })

  it('starts in pre-flop stage', () => {
    const state = createGameState(1, players)
    expect(state.stage).toBe('pre-flop')
  })

  it('posts small and big blinds', () => {
    const state = createGameState(1, players)
    const totalBets = state.players.reduce((sum, p) => sum + p.totalBet, 0)
    expect(totalBets).toBe(30) // SB=10 + BB=20
    expect(state.pot).toBe(30)
  })

  it('starts with correct player chips', () => {
    const state = createGameState(1, players)
    const totalChips = state.players.reduce((sum, p) => sum + p.chips + p.totalBet, 0)
    expect(totalChips).toBe(2000) // 2 players × 1000
  })
})

describe('processAction - fold', () => {
  it('sets player status to folded', () => {
    const state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId
    const newState = processAction(state, currentUserId, 'fold')
    const foldedPlayer = newState.players.find(p => p.userId === currentUserId)
    expect(foldedPlayer?.status).toBe('folded')
  })

  it('ignores action from wrong player', () => {
    const state = createGameState(1, players)
    const wrongUserId = state.players
      .find((_, i) => i !== state.currentPlayerIndex)!.userId
    const newState = processAction(state, wrongUserId, 'fold')
    expect(newState).toEqual(state)
  })
})

describe('processAction - call', () => {
  it('moves chips to pot on call', () => {
    const state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId
    const player = state.players.find(p => p.userId === currentUserId)!
    const toCall = state.currentBet - player.bet
    const potBefore = state.pot

    const newState = processAction(state, currentUserId, 'call')
    expect(newState.pot).toBe(potBefore + toCall)
  })
})

describe('processAction - raise', () => {
  it('increases current bet on raise', () => {
    const state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId
    const newState = processAction(state, currentUserId, 'raise', 40)
    expect(newState.currentBet).toBeGreaterThan(state.currentBet)
  })
})

describe('advanceStage', () => {
  it('pre-flop → flop adds 3 community cards', () => {
    const state = createGameState(1, players)
    const newState = advanceStage(state)
    expect(newState.stage).toBe('flop')
    expect(newState.communityCards).toHaveLength(3)
  })

  it('flop → turn adds 1 community card', () => {
    let state = createGameState(1, players)
    state = advanceStage(state) // flop
    state = advanceStage(state) // turn
    expect(state.stage).toBe('turn')
    expect(state.communityCards).toHaveLength(4)
  })

  it('turn → river adds 1 community card', () => {
    let state = createGameState(1, players)
    state = advanceStage(state)
    state = advanceStage(state)
    state = advanceStage(state)
    expect(state.stage).toBe('river')
    expect(state.communityCards).toHaveLength(5)
  })

  it('river → showdown', () => {
    let state = createGameState(1, players)
    state = advanceStage(state)
    state = advanceStage(state)
    state = advanceStage(state)
    state = advanceStage(state)
    expect(state.stage).toBe('showdown')
  })

  it('resets bets on stage advance', () => {
    const state = createGameState(1, players)
    const newState = advanceStage(state)
    for (const p of newState.players) {
      expect(p.bet).toBe(0)
    }
    expect(newState.currentBet).toBe(0)
  })
})

describe('determineWinner', () => {
  it('returns last active player if others folded', () => {
    let state = createGameState(1, players)
    // Fold player at index 0 (first to act)
    const firstPlayer = state.players[state.currentPlayerIndex]
    state = processAction(state, firstPlayer.userId, 'fold')
    const result = determineWinner(state)
    expect(result.winnerId).not.toBe(firstPlayer.userId)
  })

  it('returns a winnerId that exists in players', () => {
    let state = createGameState(1, players)
    // Advance to showdown
    state = advanceStage(state)
    state = advanceStage(state)
    state = advanceStage(state)
    state = advanceStage(state)
    const result = determineWinner(state)
    const validIds = state.players.map(p => p.userId)
    expect(validIds).toContain(result.winnerId)
  })
})

describe('isHandOver', () => {
  it('returns false at game start', () => {
    const state = createGameState(1, players)
    expect(isHandOver(state)).toBe(false)
  })

  it('returns true when only one player remains', () => {
    let state = createGameState(1, players)
    const firstPlayer = state.players[state.currentPlayerIndex]
    state = processAction(state, firstPlayer.userId, 'fold')
    expect(isHandOver(state)).toBe(true)
  })
})

describe('5-player game', () => {
  const fivePlayers = [1, 2, 3, 4, 5].map(id => ({ userId: id }))

  it('initializes correctly with 5 players', () => {
    const state = createGameState(1, fivePlayers)
    expect(state.players).toHaveLength(5)
    const totalChips = state.players.reduce((sum, p) => sum + p.chips + p.totalBet, 0)
    expect(totalChips).toBe(5000)
  })

  it('deals unique cards to all players', () => {
    const state = createGameState(1, fivePlayers)
    const allCards = state.players.flatMap(p => p.cards.map(c => `${c.rank}${c.suit}`))
    const unique = new Set(allCards)
    expect(unique.size).toBe(10) // 5 players × 2 cards
  })
})
