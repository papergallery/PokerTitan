import axios from 'axios'

const api = axios.create({ withCredentials: true })

export const matchmakingApi = {
  joinQueue: (format: '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty') =>
    api.post('/matchmaking/join', { format }),
  leaveQueue: () => api.post('/matchmaking/leave'),
}
