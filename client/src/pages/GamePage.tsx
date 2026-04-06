import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../hooks/useGame'
import { PokerTable } from '../components/game/PokerTable'
import { ActionPanel } from '../components/game/ActionPanel'
import { Button } from '../components/ui/Button'
import { socket } from '../lib/socket'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tournamentId = id ? parseInt(id, 10) : null
  const { gameState, gameEnd, isMyTurn, timeLeft, sendAction } = useGame(tournamentId)

  const format = (location.state as { format?: string })?.format ?? ''
  const isTurbo = format === '1v1-turbo'
  const isBounty = format === '5-player-bounty'

  const [bountyMsg, setBountyMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isBounty) return

    socket.on('bounty:kill', (data: { killerId: number; eliminated: number[]; bonus: number }) => {
      if (gameState && data.killerId === gameState.myUserId) {
        setBountyMsg(`+${data.bonus} MMR за выбитого игрока!`)
        setTimeout(() => setBountyMsg(null), 3000)
      }
    })

    return () => {
      socket.off('bounty:kill')
    }
  }, [isBounty, gameState])

  const myPlayer = gameState?.players.find(p => p.userId === gameState.myUserId)

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative">
      {/* Bounty toast */}
      {bountyMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-bold px-4 py-2 rounded-xl shadow-lg animate-bounce">
          💀 {bountyMsg}
        </div>
      )}

      {/* Game table */}
      <div className="flex-1 min-h-0 w-full">
        {gameState ? (
          <>
            {isTurbo && (
              <div className="flex justify-center mb-2">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  ⚡ TURBO · 10 сек
                </span>
              </div>
            )}
            <PokerTable gameState={gameState} timeLeft={timeLeft} />
          </>
        ) : (
          <p className="text-muted flex items-center justify-center h-full">Загрузка игры...</p>
        )}
      </div>

      {/* Action panel */}
      <AnimatePresence>
        {isMyTurn && myPlayer && gameState && (
          <div className="p-3 pb-6 w-full max-w-lg mx-auto">
            <ActionPanel
              currentBet={gameState.currentBet}
              myChips={myPlayer.chips}
              myBet={myPlayer.bet}
              onAction={sendAction}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Game end modal */}
      <AnimatePresence>
        {gameEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-2xl p-8 border border-border w-full max-w-sm"
            >
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Турнир завершён</h2>
              <div className="flex flex-col gap-2 mb-6">
                {gameEnd.places.map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <span className="text-muted">#{p.place} {p.name}</span>
                    <span className={p.mmrChange >= 0 ? 'text-accent font-semibold' : 'text-red-400 font-semibold'}>
                      {p.mmrChange >= 0 ? '+' : ''}{p.mmrChange} MMR
                    </span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => navigate('/lobby')}>
                В лобби
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
