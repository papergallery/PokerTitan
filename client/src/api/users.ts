import axios from 'axios'
import type { User, TournamentHistory } from '../types/user'

const api = axios.create({ withCredentials: true })

export const usersApi = {
  getProfile: (id: number) => api.get<User>(`/users/${id}`),
  getHistory: (id: number) => api.get<TournamentHistory[]>(`/users/${id}/history`),
  updateName: (name: string) => api.put<User>('/users/me', { name }),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<User>('/users/me/avatar', form)
  },
}
