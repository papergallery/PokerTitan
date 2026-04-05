import { useState, useEffect, useCallback } from 'react'
import { socket } from '../lib/socket'
import type { GameState, GameResult, GameEnd, GameAction } from '../types/game'

export function useGame(tournamentId: number | null) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [lastResult, setLastResult] = useState<GameResult | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEnd | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(30)

  useEffect(() => {
    if (!tournamentId) return
    socket.connect()

    socket.on('game:state', (state: GameState) => setGameState(state))
    socket.on('game:result', (result: GameResult) => setLastResult(result))
    socket.on('game:end', (end: GameEnd) => setGameEnd(end))
    socket.on('game:turn', (data: { userId: number; timeLeft: number }) => {
      setTimeLeft(data.timeLeft)
    })

    return () => {
      socket.off('game:state')
      socket.off('game:result')
      socket.off('game:end')
      socket.off('game:turn')
      socket.disconnect()
    }
  }, [tournamentId])

  const sendAction = useCallback((action: GameAction, amount?: number) => {
    socket.emit('game:action', { action, amount })
  }, [])

  const isMyTurn = gameState
    ? gameState.currentPlayerId === gameState.myUserId
    : false

  return { gameState, lastResult, gameEnd, isMyTurn, timeLeft, sendAction }
}
