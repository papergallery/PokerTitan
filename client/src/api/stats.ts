import axios from 'axios'

const api = axios.create({ withCredentials: true })

export const statsApi = {
  getOnline: () => api.get<{ online: number; inQueue: number; inGames: number }>('/stats/online'),
  getExtendedStats: (userId: number) =>
    api.get<{
      totalGames: number
      wins: number
      winRate: number
      mmrHistory: { mmr: number; date: string }[]
    }>(`/users/${userId}/stats`),
}
