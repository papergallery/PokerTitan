import axios from 'axios'
import type { User } from '../types/user'

const api = axios.create({ withCredentials: true })

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<{ user: User }>('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get<User>('/auth/me'),
}
