import axios from 'axios'
import type { User, TournamentHistory } from '../types/user'

const api = axios.create({ withCredentials: true })

export const usersApi = {
  getProfile: (id: number) => api.get<User>(`/users/${id}`),
  getHistory: (id: number) => api.get<TournamentHistory[]>(`/users/${id}/history`),
}
