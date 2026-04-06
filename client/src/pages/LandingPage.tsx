import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

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
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '40vw',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c41e3a)',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '40vw',
          height: '1px',
          background: 'linear-gradient(90deg, #c41e3a33, transparent)',
          zIndex: 2,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at top left, #c41e3a0a 0%, transparent 50%), radial-gradient(ellipse at bottom right, #c41e3a0a 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo suit */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ color: '#c41e3a', fontSize: '32px', lineHeight: 1 }}>♠</span>
          </div>

          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(56px, 12vw, 120px)',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              lineHeight: 1,
              margin: 0,
            }}
          >
            POKER
            <span style={{ color: '#c41e3a' }}>TITAN</span>
          </h1>

          <p
            style={{
              marginTop: '12px',
              color: '#999',
              fontSize: '12px',
              letterSpacing: '0.3em',
            }}
          >
            — PLAY · COMPETE · RANK —
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ marginTop: '48px' }}
        >
          <button
            onClick={() => navigate(user ? '/lobby' : '/login')}
            style={{
              padding: '18px 64px',
              background: '#c41e3a',
              border: '1px solid #c41e3a',
              color: '#f5f0e8',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '22px',
              letterSpacing: '0.2em',
              cursor: 'pointer',
              transition: 'background 0.25s ease, border-color 0.25s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#a01830'
              e.currentTarget.style.borderColor = '#a01830'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#c41e3a'
              e.currentTarget.style.borderColor = '#c41e3a'
            }}
          >
            ИГРАТЬ
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ marginTop: '24px' }}
        >
          <p
            style={{
              color: '#555',
              fontSize: '11px',
              letterSpacing: '0.2em',
            }}
          >
            TEXAS HOLD'EM · RANKED MATCHMAKING
          </p>
        </motion.div>
      </div>

      {/* Bottom suit strip */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '12px',
          borderTop: '1px solid #141414',
          background: '#0a0a0a',
        }}
      >
        {['♠', '♥', '◆', '♣'].map((suit, i) => (
          <span
            key={suit}
            style={{
              fontSize: '14px',
              color: i % 2 === 0 ? '#222' : '#1e1e1e',
            }}
          >
            {suit}
          </span>
        ))}
      </div>
    </div>
  )
}
