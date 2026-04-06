import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { socket } from '../lib/socket'
import { matchmakingApi } from '../api/matchmaking'
import { useAuth } from '../hooks/useAuth'

const FORMAT_LABELS: Record<string, string> = {
  '1v1': 'HEADS UP',
  '1v1-turbo': 'TURBO',
  '5-player': 'ТУРНИР',
  '5-player-bounty': 'BOUNTY',
}

const FORMAT_SUBTITLES: Record<string, string> = {
  '1v1': '1 НА 1',
  '1v1-turbo': 'ТАЙМЕР 10 СЕК',
  '5-player': '5 ИГРОКОВ',
  '5-player-bounty': '+MMR ЗА КАЖДОГО',
}

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

export default function QueuePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const format = (location.state as { format?: '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty' })?.format ?? '1v1'
  const [elapsed, setElapsed] = useState(0)
  const [queueCount, setQueueCount] = useState(1)

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const secs = (elapsed % 60).toString().padStart(2, '0')

  useEffect(() => {
    socket.connect()
    if (user) {
      socket.emit('join-queue', { format, mmr: user.mmr })
    }

    socket.on('matchmaking:found', (data: { tournamentId: number }) => {
      navigate(`/game/${data.tournamentId}`)
    })

    socket.on('queue:count', (data: { format: string; count: number }) => {
      if (data.format === format) setQueueCount(data.count)
    })

    const timer = setInterval(() => setElapsed(e => e + 1), 1000)

    return () => {
      socket.off('matchmaking:found')
      socket.off('queue:count')
      clearInterval(timer)
    }
  }, [format, navigate, user])

  async function handleCancel() {
    await matchmakingApi.leaveQueue()
    socket.emit('leave-queue', { format })
    navigate('/lobby')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '48px',
      }}
    >
      {/* Noise texture */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: noiseSVG,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.6,
        }}
      />
      {/* Accent lines */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: '40vw', height: '2px', background: 'linear-gradient(90deg, transparent, #c41e3a)', zIndex: 2 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '40vw', height: '1px', background: 'linear-gradient(90deg, #c41e3a33, transparent)', zIndex: 2 }} />
      {/* Vignette */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at top left, #c41e3a0a 0%, transparent 50%), radial-gradient(ellipse at bottom right, #c41e3a0a 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
        {/* Pulsing ring */}
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: '2px solid #c41e3a',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: '1px solid #c41e3a44',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#c41e3a', fontSize: '48px', lineHeight: 1 }}>♠</span>
          </div>
        </div>

        {/* Info block */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '36px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              lineHeight: 1,
            }}
          >
            {FORMAT_LABELS[format] ?? format.toUpperCase()}
          </div>
          <div style={{ color: '#999', fontSize: '11px', letterSpacing: '0.2em', marginTop: '6px' }}>
            {FORMAT_SUBTITLES[format] ?? ''} · ПОИСК СОПЕРНИКА
          </div>

          {/* Timer */}
          <div
            style={{
              marginTop: '20px',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '48px',
              letterSpacing: '0.1em',
              color: '#c41e3a',
              lineHeight: 1,
            }}
          >
            {mins}:{secs}
          </div>

          {/* Queue count for 5-player */}
          {(format === '5-player' || format === '5-player-bounty') && (
            <div style={{ marginTop: '12px', color: '#c41e3a', fontSize: '12px', letterSpacing: '0.15em' }}>
              {queueCount} / 5 ИГРОКОВ В ОЧЕРЕДИ
            </div>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          style={{
            padding: '14px 48px',
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: '#999',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#c41e3a'
            e.currentTarget.style.color = '#c41e3a'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#999'
          }}
        >
          ОТМЕНА
        </button>
      </div>
    </div>
  )
}
