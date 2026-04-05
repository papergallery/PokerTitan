export interface User {
  id: number
  email: string
  name: string
  avatarUrl?: string
  mmr: number
}

export interface TournamentHistory {
  tournamentId: number
  format: '1v1' | '5-player'
  place: number
  mmrChange: number
  finishedAt: string
}
