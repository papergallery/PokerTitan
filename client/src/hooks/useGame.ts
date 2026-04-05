import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socket } from '../lib/socket'
import type { GameState, GameResult, GameEnd, GameAction } from '../types/game'

export function useGame(tournamentId: number | null) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [lastResult, setLastResult] = useState<GameResult | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEnd | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tournamentId) return
    socket.connect()

    socket.on('game:state', (state: GameState) => setGameState(state))
    socket.on('game:result', (result: GameResult) => setLastResult(result))
    socket.on('game:end', (end: GameEnd) => {
      setTimeout(() => {
        setGameEnd(end)
        queryClient.invalidateQueries({ queryKey: ['me'] })
      }, 5000)
    })
    socket.on('game:turn', (data: { userId: number; timeLeft: number }) => {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeLeft(data.timeLeft)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    })

    socket.emit('game:ready', { tournamentId })

    return () => {
      socket.off('game:state')
      socket.off('game:result')
      socket.off('game:end')
      socket.off('game:turn')
      if (timerRef.current) clearInterval(timerRef.current)
      // не вызываем socket.disconnect() — сокет singleton
    }
  }, [tournamentId, queryClient])

  const sendAction = useCallback((action: GameAction, amount?: number) => {
    socket.emit('game:action', { action, amount })
  }, [])

  const isMyTurn = gameState
    ? gameState.currentPlayerId === gameState.myUserId
    : false

  return { gameState, lastResult, gameEnd, isMyTurn, timeLeft, sendAction }
}
