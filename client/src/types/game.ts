export type CardSuit = 's' | 'h' | 'd' | 'c'
export type CardRank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A'

export interface Card { rank: CardRank; suit: CardSuit }

export type GameStage = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown'
export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated'
export type GameAction = 'fold' | 'check' | 'call' | 'raise'

export interface GamePlayer {
  userId: number
  name: string
  avatarUrl?: string
  cards: (Card | null)[]
  chips: number
  status: PlayerStatus
  bet: number
  mmr: number
}

export interface GameState {
  tournamentId: number
  players: GamePlayer[]
  communityCards: Card[]
  pot: number
  currentPlayerId: number
  stage: GameStage
  currentBet: number
  myUserId: number
  timeLeft?: number
}

export interface GameResult {
  winnerId: number
  pot: number
  winningHand?: string
}

export interface GameEnd {
  places: Array<{ userId: number; name: string; place: number; mmrChange: number }>
}
