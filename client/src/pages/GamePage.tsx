import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../hooks/useGame'
import { PokerTable } from '../components/game/PokerTable'
import { ActionPanel } from '../components/game/ActionPanel'
import { Button } from '../components/ui/Button'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tournamentId = id ? parseInt(id, 10) : null
  const { gameState, gameEnd, isMyTurn, timeLeft, sendAction } = useGame(tournamentId)

  const myPlayer = gameState?.players.find(p => p.userId === gameState.myUserId)

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-4 px-4 relative">
      {/* Game table */}
      <div className="flex-1 w-full flex items-center justify-center">
        {gameState ? (
          <PokerTable gameState={gameState} timeLeft={timeLeft} />
        ) : (
          <p className="text-muted">Загрузка игры...</p>
        )}
      </div>

      {/* Action panel */}
      <AnimatePresence>
        {isMyTurn && myPlayer && gameState && (
          <div className="w-full max-w-lg">
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
