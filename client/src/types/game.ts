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
  isPremium?: boolean
  cards: (Card | null)[]
  chips: number
  status: PlayerStatus
  bet: number
  totalBet?: number
  mmr?: number
}

export interface GameState {
  tournamentId: number
  players: GamePlayer[]
  communityCards: Card[]
  pot: number
  currentPlayerId: number
  stage: GameStage
  currentBet: number
  lastRaiseIncrement: number
  myUserId: number
  timeLeft?: number
  dealerUserId?: number
  sbUserId?: number
  bbUserId?: number
}

export interface GameResult {
  winnerId: number
  pot: number
  winningHand?: string
  handName?: string
}

export interface GameEnd {
  places: Array<{ userId: number; name: string; place: number; mmrChange: number }>
}
