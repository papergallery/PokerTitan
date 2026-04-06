import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../hooks/useGame'
import { PokerTable } from '../components/game/PokerTable'
import { ActionPanel } from '../components/game/ActionPanel'
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
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: '#0a0a0a',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Bounty toast */}
      {bountyMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: '#d4af37',
            color: '#0a0a0a',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '18px',
            letterSpacing: '0.1em',
            padding: '10px 24px',
            boxShadow: '0 0 20px #d4af3766',
          }}
        >
          {bountyMsg}
        </div>
      )}

      {/* Game table */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        {gameState ? (
          <>
            {isTurbo && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#c41e3a',
                    color: '#f5f0e8',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '0.15em',
                    padding: '4px 16px',
                  }}
                >
                  TURBO · 10 СЕК
                </span>
              </div>
            )}
            <PokerTable gameState={gameState} timeLeft={timeLeft} />
          </>
        ) : (
          <p
            style={{
              color: '#555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '12px',
              letterSpacing: '0.2em',
            }}
          >
            ЗАГРУЗКА ИГРЫ...
          </p>
        )}
      </div>

      {/* Action panel */}
      <AnimatePresence>
        {isMyTurn && myPlayer && gameState && (
          <div style={{ padding: '12px 12px 24px', width: '100%', maxWidth: '512px', margin: '0 auto' }}>
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
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                padding: '40px 32px',
                width: '100%',
                maxWidth: '380px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '28px',
                  letterSpacing: '0.1em',
                  color: '#f5f0e8',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                ТУРНИР ЗАВЕРШЁН
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {gameEnd.places.map(p => (
                  <div key={p.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999', fontSize: '13px', letterSpacing: '0.05em' }}>
                      #{p.place} {p.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '18px',
                        letterSpacing: '0.05em',
                        color: p.mmrChange >= 0 ? '#c41e3a' : '#555',
                      }}
                    >
                      {p.mmrChange >= 0 ? '+' : ''}{p.mmrChange} MMR
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/lobby')}
                style={{
                  width: '100%',
                  padding: '16px 0',
                  background: '#c41e3a',
                  border: '1px solid #c41e3a',
                  color: '#f5f0e8',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '20px',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#a01830')}
                onMouseLeave={e => (e.currentTarget.style.background = '#c41e3a')}
              >
                В ЛОББИ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
