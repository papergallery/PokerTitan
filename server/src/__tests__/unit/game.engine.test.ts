import { describe, it, expect } from 'vitest'
import {
  createGameState,
  processAction,
  processSurrender,
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

  it('all-in for less than current bet does not lower currentBet', () => {
    // Set up: short stack player tries to raise but only has chips for less
    // than the current bet. Their action gets clamped to all-in, but the
    // bar (`currentBet`) for everyone else must not drop.
    const state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId
    const player = state.players.find(p => p.userId === currentUserId)!
    // Force short stack so even a min-raise overshoots their stack.
    player.chips = 5
    state.currentBet = 200
    state.lastRaiseIncrement = 100

    const newState = processAction(state, currentUserId, 'raise', 300)

    // Player went all-in for less than the current bet — their max bet is
    // their existing bet + chips. currentBet must stay ≥ 200.
    expect(newState.currentBet).toBeGreaterThanOrEqual(200)
    expect(newState.players.find(p => p.userId === currentUserId)?.chips).toBe(0)
  })
})

describe('processAction - rejected actions', () => {
  it('returns the same state reference on action by wrong player', () => {
    const state = createGameState(1, players)
    const wrongUserId = state.players
      .find((_, i) => i !== state.currentPlayerIndex)!.userId
    const result = processAction(state, wrongUserId, 'fold')
    // Reference equality so callers can detect a no-op (and emit game:error).
    expect(result).toBe(state)
  })

  it('returns the same state reference on illegal check', () => {
    // At pre-flop, the player to act has toCall > 0, so a check is illegal.
    const state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId
    const result = processAction(state, currentUserId, 'check')
    expect(result).toBe(state)
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

describe('processSurrender', () => {
  it('forfeits player chips into pot and eliminates them', () => {
    const state = createGameState(1, players)
    const targetId = state.players[0].userId
    const targetPlayer = state.players.find(p => p.userId === targetId)!
    const initialChips = targetPlayer.chips
    const initialPot = state.pot

    const newState = processSurrender(state, targetId)
    const newPlayer = newState.players.find(p => p.userId === targetId)!

    expect(newPlayer.chips).toBe(0)
    expect(newPlayer.bet).toBe(0)
    expect(newPlayer.status).toBe('eliminated')
    // Pot grows by exactly the unbet stack — `player.bet` was already in pot.
    expect(newState.pot).toBe(initialPot + initialChips)
  })

  it('does not double-count player.bet (regression for surrender pot bug)', () => {
    let state = createGameState(1, players)
    const currentUserId = state.players[state.currentPlayerIndex].userId

    // Player makes a bet — pot grows AND player.bet > 0.
    state = processAction(state, currentUserId, 'call')
    const player = state.players.find(p => p.userId === currentUserId)!
    const potAfterCall = state.pot
    const chipsAfterCall = player.chips
    const betAfterCall = player.bet
    expect(betAfterCall).toBeGreaterThan(0)

    // Surrender: pot must grow by chips ONLY, not chips + bet.
    const newState = processSurrender(state, currentUserId)
    expect(newState.pot).toBe(potAfterCall + chipsAfterCall)
    expect(newState.pot).toBeLessThan(potAfterCall + chipsAfterCall + betAfterCall)
  })

  it('returns same state reference when player is already eliminated', () => {
    let state = createGameState(1, players)
    state = processSurrender(state, 1)
    const result = processSurrender(state, 1)
    expect(result).toBe(state)
  })

  it('returns same state reference when userId is not in the game', () => {
    const state = createGameState(1, players)
    const result = processSurrender(state, 99999)
    expect(result).toBe(state)
  })

  it('advances currentPlayerIndex when surrendering player was current', () => {
    const state = createGameState(1, [
      { userId: 1 },
      { userId: 2 },
      { userId: 3 },
    ])
    const currentIdx = state.currentPlayerIndex
    const currentUserId = state.players[currentIdx].userId

    const newState = processSurrender(state, currentUserId)
    expect(newState.currentPlayerIndex).not.toBe(currentIdx)
    // Next active player should now be at the new index.
    expect(newState.players[newState.currentPlayerIndex].status).toBe('active')
  })

  it('does not change currentPlayerIndex when a non-current player surrenders', () => {
    const state = createGameState(1, [
      { userId: 1 },
      { userId: 2 },
      { userId: 3 },
    ])
    const currentIdx = state.currentPlayerIndex
    const otherUserId = state.players.find((_, i) => i !== currentIdx)!.userId

    const newState = processSurrender(state, otherUserId)
    expect(newState.currentPlayerIndex).toBe(currentIdx)
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
