import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchmakingApi } from '../api/matchmaking'
import { Avatar } from '../components/ui/Avatar'

type Format = '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'

interface FormatDef {
  id: Format
  label: string
  subtitle: string
  suit: string
  suitSymbol: string
  desc: string
  stat: string
  premium: boolean
  accentColor: string
}

const formats: FormatDef[] = [
  {
    id: '1v1',
    label: 'HEADS UP',
    subtitle: '1 на 1',
    suit: 'SPADES',
    suitSymbol: '♠',
    desc: 'Дуэль один на один. Нет укрытия. Нет союзников.',
    stat: '2 ИГРОКА',
    premium: false,
    accentColor: '#f5f0e8',
  },
  {
    id: '5-player',
    label: 'ТУРНИР',
    subtitle: '5 игроков',
    suit: 'HEARTS',
    suitSymbol: '♥',
    desc: 'Пятеро сели за стол. Один встанет богаче.',
    stat: '5 ИГРОКОВ · ×2 MMR',
    premium: false,
    accentColor: '#c41e3a',
  },
  {
    id: '1v1-turbo',
    label: 'TURBO',
    subtitle: 'Таймер 10 сек',
    suit: 'DIAMONDS',
    suitSymbol: '◆',
    desc: 'Каждое решение — 10 секунд. Думай быстро или умри.',
    stat: '2 ИГРОКА · БЫСТРЫЙ',
    premium: true,
    accentColor: '#d4af37',
  },
  {
    id: '5-player-bounty',
    label: 'BOUNTY',
    subtitle: '+MMR за каждого',
    suit: 'CLUBS',
    suitSymbol: '♣',
    desc: 'За каждого уничтоженного — награда. Охота открыта.',
    stat: '5 ИГРОКОВ · БОНУС',
    premium: true,
    accentColor: '#d4af37',
  },
]

// Noise texture as SVG data URI
const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

export default function LobbyPage2() {
  const navigate = useNavigate()
  const { user, logoutMutation } = useAuth()
  const [selected, setSelected] = useState<Format | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<Format | null>(null)

  const isPremium = user?.isPremium ?? false

  useEffect(() => {
    const t = setTimeout(() => setScanDone(true), 800)
    return () => clearTimeout(t)
  }, [])

  async function handleFindGame() {
    if (!selected) return
    setLoading(true)
    try {
      await matchmakingApi.joinQueue(selected as '1v1' | '5-player')
      navigate('/queue', { state: { format: selected } })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const selectedFormat = formats.find(f => f.id === selected)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Noise texture overlay */}
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

      {/* Diagonal accent line — top right */}
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
      {/* Diagonal accent line — bottom left */}
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

      {/* Scan line effect on load */}
      {!scanDone && (
        <motion.div
          initial={{ top: '-4px' }}
          animate={{ top: '110vh' }}
          transition={{ duration: 0.7, ease: 'easeIn' }}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #c41e3a, transparent)',
            zIndex: 100,
            boxShadow: '0 0 24px 4px #c41e3a88',
          }}
        />
      )}

      {/* Subtle red vignette corners */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at top left, #c41e3a0a 0%, transparent 50%), radial-gradient(ellipse at bottom right, #c41e3a0a 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid #1e1e1e',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#c41e3a', fontSize: '22px', lineHeight: 1 }}>♠</span>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '28px',
              letterSpacing: '0.12em',
              color: '#f5f0e8',
              lineHeight: 1,
            }}
          >
            POKERTITAN
          </span>
        </div>

        {/* Right nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* MMR chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              border: '1px solid #2a2a2a',
              background: '#111',
            }}
          >
            <span style={{ color: '#888', fontSize: '11px', letterSpacing: '0.1em' }}>MMR</span>
            <span
              style={{
                color: user.mmr > 1500 ? '#d4af37' : user.mmr >= 1000 ? '#c41e3a' : '#f5f0e8',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '20px',
                letterSpacing: '0.05em',
              }}
            >
              {user.mmr}
            </span>
          </div>

          {/* User button */}
          <button
            onClick={() => navigate(`/profile/${user.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              opacity: 1,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <span
              style={{
                color: isPremium ? '#d4af37' : '#f5f0e8',
                fontSize: '13px',
                letterSpacing: '0.05em',
                fontWeight: 500,
              }}
            >
              {user.name.toUpperCase()}
            </span>
          </button>

          <button
            onClick={() => navigate('/shop')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#555',
              fontSize: '12px',
              letterSpacing: '0.12em',
              transition: 'color 0.2s',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f5f0e8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            МАГАЗИН
          </button>

          <button
            onClick={() => logoutMutation.mutate()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#444',
              fontSize: '12px',
              letterSpacing: '0.12em',
              transition: 'color 0.2s',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c41e3a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            ВЫЙТИ
          </button>
        </div>
      </motion.header>

      {/* Main */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 16px 80px',
          gap: '40px',
        }}
      >
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{ textAlign: 'center' }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(48px, 8vw, 88px)',
              letterSpacing: '0.08em',
              color: '#f5f0e8',
              lineHeight: 1,
            }}
          >
            ВЫБЕРИ
            <span style={{ color: '#c41e3a', marginLeft: '0.2em' }}>ФОРМАТ</span>
          </div>
          <div
            style={{
              marginTop: '8px',
              color: '#444',
              fontSize: '11px',
              letterSpacing: '0.25em',
            }}
          >
            — TEXAS HOLD'EM · RANKED MATCHMAKING —
          </div>
        </motion.div>

        {/* Format cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2px',
            width: '100%',
            maxWidth: '960px',
          }}
        >
          {formats.map((f, i) => {
            const locked = f.premium && !isPremium
            const isSelected = selected === f.id
            const isHovered = hoveredCard === f.id

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
              >
                <button
                  onClick={() => !locked && setSelected(f.id)}
                  onMouseEnter={() => setHoveredCard(f.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  disabled={locked}
                  style={{
                    width: '100%',
                    background: isSelected
                      ? '#120a0a'
                      : isHovered && !locked
                      ? '#0f0f0f'
                      : '#0d0d0d',
                    border: `1px solid ${
                      isSelected
                        ? f.id === '1v1-turbo' || f.id === '5-player-bounty'
                          ? '#d4af3766'
                          : '#c41e3a66'
                        : isHovered && !locked
                        ? '#2a2a2a'
                        : '#181818'
                    }`,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    padding: '32px 28px',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    opacity: locked ? 0.45 : 1,
                  }}
                >
                  {/* Selected indicator — left bar */}
                  {isSelected && (
                    <motion.div
                      layoutId="selectedBar"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: f.accentColor,
                      }}
                    />
                  )}

                  {/* Corner suit watermark */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '20px',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '56px',
                      color: isSelected ? f.accentColor + '22' : '#1a1a1a',
                      lineHeight: 1,
                      transition: 'color 0.3s',
                      userSelect: 'none',
                    }}
                  >
                    {f.suitSymbol}
                  </div>

                  {/* Suit label */}
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.3em',
                      color: isSelected ? f.accentColor : '#333',
                      marginBottom: '16px',
                      transition: 'color 0.2s',
                      fontWeight: 700,
                    }}
                  >
                    {f.suit}
                  </div>

                  {/* Format title */}
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '40px',
                      letterSpacing: '0.06em',
                      color: '#f5f0e8',
                      lineHeight: 1,
                      marginBottom: '4px',
                    }}
                  >
                    {f.label}
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: isSelected ? '#888' : '#444',
                      letterSpacing: '0.05em',
                      marginBottom: '20px',
                      transition: 'color 0.2s',
                    }}
                  >
                    {f.subtitle}
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      background: isSelected ? f.accentColor + '33' : '#1e1e1e',
                      marginBottom: '16px',
                      transition: 'background 0.2s',
                    }}
                  />

                  {/* Description */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      lineHeight: 1.7,
                      letterSpacing: '0.02em',
                      marginBottom: '20px',
                    }}
                  >
                    {f.desc}
                  </div>

                  {/* Bottom row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        color: '#555',
                        fontWeight: 700,
                      }}
                    >
                      {f.stat}
                    </span>
                    {f.premium && (
                      <span
                        style={{
                          fontSize: '10px',
                          letterSpacing: '0.2em',
                          color: '#d4af37',
                          fontWeight: 700,
                          border: '1px solid #d4af3755',
                          padding: '2px 8px',
                        }}
                      >
                        {locked ? '🔒 PREMIUM' : 'PREMIUM'}
                      </span>
                    )}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* CTA section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '440px',
          }}
        >
          {/* Selection label */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: '#555',
                  textAlign: 'center',
                }}
              >
                ВЫБРАНО:{' '}
                <span
                  style={{
                    color: selectedFormat?.accentColor ?? '#f5f0e8',
                  }}
                >
                  {selectedFormat?.label}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: '#333',
                }}
              >
                ↑ ВЫБЕРИТЕ ФОРМАТ ВЫШЕ
              </motion.div>
            )}
          </AnimatePresence>

          {/* Find Game button */}
          <button
            onClick={handleFindGame}
            disabled={!selected || loading}
            style={{
              width: '100%',
              padding: '18px 0',
              background: selected && !loading ? '#c41e3a' : 'transparent',
              border: `1px solid ${selected && !loading ? '#c41e3a' : '#222'}`,
              color: selected && !loading ? '#f5f0e8' : '#333',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '22px',
              letterSpacing: '0.2em',
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (selected && !loading) {
                e.currentTarget.style.background = '#a01830'
                e.currentTarget.style.borderColor = '#a01830'
              }
            }}
            onMouseLeave={e => {
              if (selected && !loading) {
                e.currentTarget.style.background = '#c41e3a'
                e.currentTarget.style.borderColor = '#c41e3a'
              }
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <LoadingDots />
                ПОИСК СОПЕРНИКА
              </span>
            ) : (
              'НАЙТИ ИГРУ'
            )}
          </button>
        </motion.div>
      </main>

      {/* Bottom suit strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
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
              letterSpacing: '0.2em',
            }}
          >
            {suit}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          style={{
            width: '4px',
            height: '4px',
            background: '#f5f0e8',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}
