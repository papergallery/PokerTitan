import { io } from 'socket.io-client'

// In dev: VITE_SERVER_URL=http://localhost:3001 (socket.io not proxied by Vite)
// In prod: empty string → same origin → Nginx proxies /socket.io/
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? ''

export const socket = io(SERVER_URL, {
  withCredentials: true,
  autoConnect: false,
})
