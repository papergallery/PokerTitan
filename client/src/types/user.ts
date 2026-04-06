export interface User {
  id: number
  email: string
  name: string
  avatarUrl?: string
  mmr: number
  isPremium?: boolean
}

export interface TournamentHistory {
  tournamentId: number
  format: '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'
  place: number
  mmrChange: number
  finishedAt: string
}
