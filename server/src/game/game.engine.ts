import { Card, createShuffledDeck, cardToString } from './deck';
import { Hand } from 'pokersolver';

// ─── Types ──────────────────────────────────────────────────────────

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated';
export type GameStage = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GamePlayer {
  userId: number;
  cards: Card[];
  chips: number;
  status: PlayerStatus;
  bet: number;       // Current round bet (resets each street)
  totalBet: number;  // Total bet across all streets in this hand
  hasActed: boolean;  // Has player acted this betting round?
}

export interface GameState {
  tournamentId: number;
  players: GamePlayer[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentPlayerIndex: number;
  stage: GameStage;
  dealerUserId: number;   // Track dealer by userId, not index (survives eliminations)
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  lastRaiseIncrement: number;
  actionsThisRound: number;
}

export interface PotResult {
  winnerIds: number[];
  amount: number;
  handName: string;
}

const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// ─── Helpers ────────────────────────────────────────────────────────

/** All players still in the hand (active or all-in) */
function activePlayers(state: GameState): GamePlayer[] {
  return state.players.filter(p => p.status === 'active' || p.status === 'all-in');
}

/** Find index of player by userId */
function playerIndex(state: GameState, userId: number): number {
  return state.players.findIndex(p => p.userId === userId);
}

/** Find dealer's current index in players array */
export function dealerIndex(state: GameState): number {
  const idx = state.players.findIndex(p => p.userId === state.dealerUserId);
  return idx >= 0 ? idx : 0;
}

/** Find next player with status 'active'. Skips folded, eliminated, all-in. */
export function nextActivePlayerPublic(state: GameState, fromIndex: number): number {
  return nextActivePlayer(state, fromIndex);
}

function nextActivePlayer(state: GameState, fromIndex: number): number {
  const n = state.players.length;
  let idx = (fromIndex + 1) % n;
  let tries = 0;
  while (state.players[idx].status !== 'active' && tries < n) {
    idx = (idx + 1) % n;
    tries++;
  }
  return idx;
}

/** Find first active player starting from (and including) startIndex. */
function firstActiveFrom(state: GameState, startIndex: number): number {
  const n = state.players.length;
  let idx = startIndex % n;
  let tries = 0;
  while (state.players[idx].status !== 'active' && tries < n) {
    idx = (idx + 1) % n;
    tries++;
  }
  return idx;
}

// ─── Create Game State ──────────────────────────────────────────────

export function createGameState(
  tournamentId: number,
  players: { userId: number; chips?: number }[],
  prevDealerUserId?: number
): GameState {
  const deck = createShuffledDeck();

  const gamePlayers: GamePlayer[] = players.map(p => ({
    userId: p.userId,
    cards: [deck.pop()!, deck.pop()!],
    chips: p.chips ?? 1000,
    status: 'active' as PlayerStatus,
    bet: 0,
    totalBet: 0,
    hasActed: false,
  }));

  const n = gamePlayers.length;

  // Determine dealer: rotate to next player after previous dealer
  let dlrIdx = 0;
  if (prevDealerUserId !== undefined) {
    // Find the previous dealer's position in the NEW player list
    const prevIdx = gamePlayers.findIndex(p => p.userId === prevDealerUserId);
    if (prevIdx >= 0) {
      dlrIdx = (prevIdx + 1) % n;
    } else {
      // Previous dealer was eliminated — find the next player clockwise
      // Since eliminated players are removed, index 0 is fine as fallback
      dlrIdx = 0;
    }
  }

  const dealerUId = gamePlayers[dlrIdx].userId;
  const isHeadsUp = n === 2;

  // Heads-up: button = SB, other = BB
  // Multi: SB = left of button, BB = left of SB
  const sbIdx = isHeadsUp ? dlrIdx : (dlrIdx + 1) % n;
  const bbIdx = isHeadsUp ? (dlrIdx + 1) % n : (dlrIdx + 2) % n;

  // Post small blind
  const sbAmount = Math.min(SMALL_BLIND, gamePlayers[sbIdx].chips);
  gamePlayers[sbIdx].chips -= sbAmount;
  gamePlayers[sbIdx].bet = sbAmount;
  gamePlayers[sbIdx].totalBet = sbAmount;
  if (gamePlayers[sbIdx].chips === 0) gamePlayers[sbIdx].status = 'all-in';

  // Post big blind
  const bbAmount = Math.min(BIG_BLIND, gamePlayers[bbIdx].chips);
  gamePlayers[bbIdx].chips -= bbAmount;
  gamePlayers[bbIdx].bet = bbAmount;
  gamePlayers[bbIdx].totalBet = bbAmount;
  if (gamePlayers[bbIdx].chips === 0) gamePlayers[bbIdx].status = 'all-in';

  // Pre-flop first to act:
  //   Heads-up: SB/button acts first
  //   Multi: player left of BB (UTG)
  let firstToAct: number;
  if (isHeadsUp) {
    firstToAct = gamePlayers[sbIdx].status === 'active' ? sbIdx : bbIdx;
  } else {
    firstToAct = firstActiveFrom({ players: gamePlayers } as GameState, (bbIdx + 1) % n);
  }

  return {
    tournamentId,
    players: gamePlayers,
    deck,
    communityCards: [],
    pot: sbAmount + bbAmount,
    currentPlayerIndex: firstToAct,
    stage: 'pre-flop',
    dealerUserId: dealerUId,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    currentBet: BIG_BLIND,
    lastRaiseIncrement: BIG_BLIND,
    actionsThisRound: 0,
  };
}

// ─── Process Action ─────────────────────────────────────────────────

/**
 * Apply a player action.
 *
 * Returns the original `state` reference (no clone) when the action is
 * rejected — callers can detect a no-op via reference equality.
 */
export function processAction(
  state: GameState,
  userId: number,
  action: 'fold' | 'check' | 'call' | 'raise',
  amount?: number
): GameState {
  const pIdx = state.players.findIndex(p => p.userId === userId);
  if (pIdx === -1 || pIdx !== state.currentPlayerIndex) return state;

  const player = state.players[pIdx];
  if (player.status !== 'active') return state;

  const toCall = state.currentBet - player.bet;
  if (action === 'check' && toCall > 0) return state;

  // Pre-compute raise targets so we can reject before cloning.
  let targetBet = 0;
  if (action === 'raise') {
    const minRaiseTotal = state.currentBet + state.lastRaiseIncrement;
    targetBet = amount ?? minRaiseTotal;
    const maxBet = player.bet + player.chips;
    if (targetBet < minRaiseTotal && targetBet < maxBet) {
      targetBet = minRaiseTotal;
    }
    targetBet = Math.min(targetBet, maxBet);
    if (targetBet - player.bet <= 0) return state;
  }

  // From here we will mutate — clone the state.
  const s = structuredClone(state) as GameState;
  const sPlayer = s.players[pIdx];

  switch (action) {
    case 'fold':
      sPlayer.status = 'folded';
      break;

    case 'check':
      // Already validated above.
      break;

    case 'call': {
      const actualCall = Math.min(toCall, sPlayer.chips);
      sPlayer.chips -= actualCall;
      sPlayer.bet += actualCall;
      sPlayer.totalBet += actualCall;
      s.pot += actualCall;
      if (sPlayer.chips === 0) sPlayer.status = 'all-in';
      break;
    }

    case 'raise': {
      const toAdd = targetBet - sPlayer.bet;
      const raiseIncrement = targetBet - s.currentBet;
      const isFullRaise = raiseIncrement >= s.lastRaiseIncrement;

      sPlayer.chips -= toAdd;
      sPlayer.bet = targetBet;
      sPlayer.totalBet += toAdd;
      s.pot += toAdd;
      // All-in for less than current bet must NOT lower the bar for others.
      s.currentBet = Math.max(s.currentBet, targetBet);

      if (isFullRaise) {
        s.lastRaiseIncrement = raiseIncrement;
      }

      if (sPlayer.chips === 0) sPlayer.status = 'all-in';

      // Only a FULL raise reopens action for other still-active players.
      if (isFullRaise) {
        s.players.forEach((p, i) => {
          if (i !== pIdx && p.status === 'active') {
            p.hasActed = false;
          }
        });
      }
      break;
    }
  }

  sPlayer.hasActed = true;
  s.actionsThisRound++;
  s.currentPlayerIndex = nextActivePlayer(s, pIdx);
  return s;
}

// ─── Process Surrender ──────────────────────────────────────────────

/**
 * Apply a player surrender — they forfeit their remaining stack into the
 * pot and become eliminated.
 *
 * Returns the original `state` reference unchanged if the surrender is a
 * no-op (player not in game or already eliminated). Callers can detect
 * this via reference equality.
 */
export function processSurrender(state: GameState, userId: number): GameState {
  const pIdx = state.players.findIndex(p => p.userId === userId);
  if (pIdx === -1) return state;

  const player = state.players[pIdx];
  if (player.status === 'eliminated') return state;

  const s = structuredClone(state) as GameState;
  const sPlayer = s.players[pIdx];

  // `player.bet` is already counted in `s.pot` (added on call/raise),
  // so we only forfeit the unbet stack to avoid double-count.
  s.pot += sPlayer.chips;
  sPlayer.chips = 0;
  sPlayer.bet = 0;
  sPlayer.status = 'eliminated';

  // If the surrendering player was current to act, advance the turn.
  if (s.currentPlayerIndex === pIdx) {
    s.currentPlayerIndex = nextActivePlayer(s, pIdx);
  }

  return s;
}

// ─── Can player check? ──────────────────────────────────────────────

export function canCheck(state: GameState, userId: number): boolean {
  const player = state.players.find(p => p.userId === userId);
  if (!player || player.status !== 'active') return false;
  return state.currentBet <= player.bet;
}

// ─── Advance Stage ──────────────────────────────────────────────────

export function advanceStage(state: GameState): GameState {
  const s = structuredClone(state) as GameState;

  s.players.forEach(p => {
    p.bet = 0;
    p.hasActed = false;
  });
  s.currentBet = 0;
  s.lastRaiseIncrement = s.bigBlind;
  s.actionsThisRound = 0;

  switch (s.stage) {
    case 'pre-flop':
      s.communityCards.push(s.deck.pop()!, s.deck.pop()!, s.deck.pop()!);
      s.stage = 'flop';
      break;
    case 'flop':
      s.communityCards.push(s.deck.pop()!);
      s.stage = 'turn';
      break;
    case 'turn':
      s.communityCards.push(s.deck.pop()!);
      s.stage = 'river';
      break;
    case 'river':
      s.stage = 'showdown';
      break;
  }

  // Post-flop: first active player left of dealer
  const dlrIdx = dealerIndex(s);
  const n = s.players.length;
  s.currentPlayerIndex = firstActiveFrom(s, (dlrIdx + 1) % n);

  return s;
}

// ─── Side Pots & Winners ────────────────────────────────────────────

/**
 * Correct side pot algorithm:
 * 1. Collect ALL players who contributed (including folded)
 * 2. Get unique bet levels from ALL contributors
 * 3. For each level, calculate how much each contributor put in
 * 4. Only ACTIVE players (not folded/eliminated) can WIN, but folded players CONTRIBUTE
 */
export function calculatePots(state: GameState): PotResult[] {
  const active = activePlayers(state);

  // Single player left — wins entire pot
  if (active.length === 1) {
    return [{
      winnerIds: [active[0].userId],
      amount: state.pot,
      handName: 'Last player standing',
    }];
  }

  // ALL contributors (including folded) — everyone who put chips in
  const contributors = state.players.filter(p => p.totalBet > 0);
  if (contributors.length === 0) return [];

  // Get unique sorted bet levels from ALL contributors
  const allBetLevels = [...new Set(contributors.map(p => p.totalBet))].sort((a, b) => a - b);

  // Evaluate hands for active players only (they can win)
  const hands = active.map(p => {
    const allCards = [
      ...p.cards.map(cardToString),
      ...state.communityCards.map(cardToString),
    ];
    return { userId: p.userId, hand: Hand.solve(allCards), totalBet: p.totalBet };
  });

  const results: PotResult[] = [];
  let prevLevel = 0;

  for (const level of allBetLevels) {
    const increment = level - prevLevel;
    if (increment <= 0) continue;

    // Calculate pot: each contributor puts in min(their totalBet, level) - min(their totalBet, prevLevel)
    let potAmount = 0;
    for (const p of contributors) {
      const contribution = Math.min(p.totalBet, level) - Math.min(p.totalBet, prevLevel);
      potAmount += Math.max(0, contribution);
    }

    if (potAmount <= 0) {
      prevLevel = level;
      continue;
    }

    // Eligible winners: ACTIVE players who bet at least this level
    const eligible = hands.filter(h => h.totalBet >= level);

    if (eligible.length === 0) {
      // No active player eligible at this level — award to any active player
      // (this happens when a folded player bet more than all active players)
      // Give to the best hand among all active players
      const allActive = hands;
      if (allActive.length > 0) {
        const winners = Hand.winners(allActive.map(h => h.hand));
        const winnerIds = allActive
          .filter(h => winners.includes(h.hand))
          .map(h => h.userId);
        results.push({
          winnerIds,
          amount: potAmount,
          handName: (winners[0] as { name: string }).name ?? 'Unknown',
        });
      }
    } else if (eligible.length === 1) {
      results.push({
        winnerIds: [eligible[0].userId],
        amount: potAmount,
        handName: eligible[0].hand.name ?? 'Unknown',
      });
    } else {
      const winners = Hand.winners(eligible.map(h => h.hand));
      const winnerIds = eligible
        .filter(h => winners.includes(h.hand))
        .map(h => h.userId);
      results.push({
        winnerIds,
        amount: potAmount,
        handName: (winners[0] as { name: string }).name ?? 'Unknown',
      });
    }

    prevLevel = level;
  }

  // Verify total awarded matches pot (safety check)
  const totalAwarded = results.reduce((sum, r) => sum + r.amount, 0);
  if (totalAwarded < state.pot && results.length > 0) {
    // Leftover chips (from rounding or folded excess) go to last pot winner
    results[results.length - 1].amount += state.pot - totalAwarded;
  }

  return results;
}

/** Legacy wrapper — returns single main winner (largest pot) */
export function determineWinner(state: GameState): { winnerId: number; handName: string } {
  const pots = calculatePots(state);
  if (pots.length === 0) {
    const active = activePlayers(state);
    return { winnerId: active[0]?.userId ?? state.players[0].userId, handName: 'Unknown' };
  }
  const main = pots.reduce((a, b) => a.amount > b.amount ? a : b);
  return { winnerId: main.winnerIds[0], handName: main.handName };
}

// ─── Betting Round Over? ────────────────────────────────────────────

export function isBettingRoundOver(state: GameState): boolean {
  const active = state.players.filter(p => p.status === 'active');

  // No active players (all folded or all-in)
  if (active.length === 0) return true;

  // Only 1 active player and rest all-in — they must have acted and matched
  if (active.length === 1) {
    const allIn = state.players.filter(p => p.status === 'all-in');
    if (allIn.length > 0 && active[0].hasActed && active[0].bet >= state.currentBet) {
      return true;
    }
  }

  // All active players must have acted AND matched the current bet
  return active.every(p => p.hasActed) && active.every(p => p.bet === state.currentBet);
}

// ─── Hand Over? ─────────────────────────────────────────────────────

export function isHandOver(state: GameState): boolean {
  return activePlayers(state).length <= 1;
}
