import { Card, createShuffledDeck, cardToString } from './deck';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Hand } = require('pokersolver');

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated';
export type GameStage = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GamePlayer {
  userId: number;
  cards: Card[];
  chips: number;
  status: PlayerStatus;
  bet: number;
  totalBet: number;
}

export interface GameState {
  tournamentId: number;
  players: GamePlayer[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentPlayerIndex: number;
  stage: GameStage;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  actionsThisRound: number;
}

const SMALL_BLIND = 10;
const BIG_BLIND = 20;

export function createGameState(
  tournamentId: number,
  players: { userId: number }[]
): GameState {
  const deck = createShuffledDeck();

  const gamePlayers: GamePlayer[] = players.map((p) => ({
    userId: p.userId,
    cards: [deck.pop()!, deck.pop()!],
    chips: 1000,
    status: 'active',
    bet: 0,
    totalBet: 0,
  }));

  const dealerIndex = 0;
  const sbIndex = (dealerIndex + 1) % gamePlayers.length;
  const bbIndex = (dealerIndex + 2) % gamePlayers.length;

  // Post blinds
  gamePlayers[sbIndex].chips -= SMALL_BLIND;
  gamePlayers[sbIndex].bet = SMALL_BLIND;
  gamePlayers[sbIndex].totalBet = SMALL_BLIND;

  gamePlayers[bbIndex].chips -= BIG_BLIND;
  gamePlayers[bbIndex].bet = BIG_BLIND;
  gamePlayers[bbIndex].totalBet = BIG_BLIND;

  const firstToAct = (bbIndex + 1) % gamePlayers.length;

  return {
    tournamentId,
    players: gamePlayers,
    deck,
    communityCards: [],
    pot: SMALL_BLIND + BIG_BLIND,
    currentPlayerIndex: firstToAct,
    stage: 'pre-flop',
    dealerIndex,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    currentBet: BIG_BLIND,
    actionsThisRound: 0,
  };
}

function nextActivePlayer(state: GameState, fromIndex: number): number {
  let idx = (fromIndex + 1) % state.players.length;
  let tries = 0;
  while (
    (state.players[idx].status === 'folded' || state.players[idx].status === 'eliminated') &&
    tries < state.players.length
  ) {
    idx = (idx + 1) % state.players.length;
    tries++;
  }
  return idx;
}

function activePlayers(state: GameState): GamePlayer[] {
  return state.players.filter((p) => p.status === 'active' || p.status === 'all-in');
}

export function processAction(
  state: GameState,
  userId: number,
  action: 'fold' | 'check' | 'call' | 'raise',
  amount?: number
): GameState {
  const s = structuredClone(state) as GameState;
  const playerIndex = s.players.findIndex((p) => p.userId === userId);
  if (playerIndex === -1 || playerIndex !== s.currentPlayerIndex) return s;

  const player = s.players[playerIndex];

  switch (action) {
    case 'fold':
      player.status = 'folded';
      break;
    case 'check':
      // only valid if no current bet or player already matched
      break;
    case 'call': {
      const toCall = s.currentBet - player.bet;
      const actualCall = Math.min(toCall, player.chips);
      player.chips -= actualCall;
      player.bet += actualCall;
      player.totalBet += actualCall;
      s.pot += actualCall;
      if (player.chips === 0) player.status = 'all-in';
      break;
    }
    case 'raise': {
      const raiseAmount = amount ?? s.bigBlind * 2;
      const toCall = s.currentBet - player.bet;
      const total = toCall + raiseAmount;
      const actual = Math.min(total, player.chips);
      player.chips -= actual;
      player.bet += actual;
      player.totalBet += actual;
      s.pot += actual;
      s.currentBet = player.bet;
      if (player.chips === 0) player.status = 'all-in';
      break;
    }
  }

  s.actionsThisRound++;
  s.currentPlayerIndex = nextActivePlayer(s, playerIndex);
  return s;
}

export function advanceStage(state: GameState): GameState {
  const s = structuredClone(state) as GameState;

  // Reset bets for new round
  s.players.forEach((p) => { p.bet = 0; });
  s.currentBet = 0;
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

  // First to act is left of dealer
  const firstIdx = (s.dealerIndex + 1) % s.players.length;
  s.currentPlayerIndex = s.players[firstIdx].status === 'active'
    ? firstIdx
    : nextActivePlayer(s, firstIdx);

  return s;
}

export function determineWinner(
  state: GameState
): { winnerId: number; handName: string } {
  const active = activePlayers(state);
  if (active.length === 1) {
    return { winnerId: active[0].userId, handName: 'Last player standing' };
  }

  const hands = active.map((p) => {
    const allCards = [
      ...p.cards.map(cardToString),
      ...state.communityCards.map(cardToString),
    ];
    return { userId: p.userId, hand: Hand.solve(allCards) };
  });

  const winner = Hand.winners(hands.map((h) => h.hand));
  const winnerHand = hands.find((h) => h.hand === winner[0]);

  return {
    winnerId: winnerHand?.userId ?? active[0].userId,
    handName: (winner[0] as { name: string }).name ?? 'Unknown',
  };
}

export function isBettingRoundOver(state: GameState): boolean {
  const active = state.players.filter((p) => p.status === 'active');
  if (active.length <= 1) return true;
  // All active players have matched the current bet and everyone has acted
  const allMatched = active.every((p) => p.bet === state.currentBet);
  return allMatched && state.actionsThisRound >= active.length;
}

export function isHandOver(state: GameState): boolean {
  const stillIn = activePlayers(state);
  return stillIn.length <= 1;
}
