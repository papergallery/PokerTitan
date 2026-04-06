import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchmakingApi } from '../api/matchmaking'
import { Avatar } from '../components/ui/Avatar'

type Format = '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'

interface FormatDef {
  id: Format
  title: string
  subtitle: string
  italicLine: string
  players: string
  extra: string
  premium: boolean
  symbol: string
  romanNumeral: string
}

const formats: FormatDef[] = [
  {
    id: '1v1',
    title: 'Duel',
    subtitle: 'Один на один',
    italicLine: 'Two players. One survivor.',
    players: '2 игрока',
    extra: 'Стандартный MMR',
    premium: false,
    symbol: '✦',
    romanNumeral: 'I',
  },
  {
    id: '5-player',
    title: 'Grand Tour',
    subtitle: 'Турнир 5 игроков',
    italicLine: 'The table selects its king.',
    players: '5 игроков',
    extra: '×2 MMR награда',
    premium: false,
    symbol: '❖',
    romanNumeral: 'II',
  },
  {
    id: '1v1-turbo',
    title: 'Turbo',
    subtitle: 'Дуэль · 10 секунд',
    italicLine: 'Fortune favours the swift.',
    players: '2 игрока',
    extra: 'Таймер 10 сек',
    premium: true,
    symbol: '◈',
    romanNumeral: 'III',
  },
  {
    id: '5-player-bounty',
    title: 'Bounty',
    subtitle: 'Охота · 5 игроков',
    italicLine: 'Every elimination has a price.',
    players: '5 игроков',
    extra: 'Бонус за каждого',
    premium: true,
    symbol: '⬡',
    romanNumeral: 'IV',
  },
]

// Constellation star positions (x%, y% within card)
const constellations: Record<Format, Array<[number, number]>> = {
  '1v1': [[15, 20], [82, 15], [50, 60], [28, 78], [70, 85]],
  '5-player': [[10, 30], [50, 12], [88, 28], [72, 72], [25, 68]],
  '1v1-turbo': [[20, 15], [60, 25], [85, 60], [45, 80], [15, 70]],
  '5-player-bounty': [[35, 10], [75, 20], [90, 50], [65, 85], [20, 55]],
}

function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.4,
    delay: Math.random() * 5,
    duration: Math.random() * 4 + 3,
  }))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {stars.map(star => (
        <motion.div
          key={star.id}
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            background: '#c9a84c',
            boxShadow: `0 0 ${star.size * 2}px 0 rgba(201,168,76,0.6)`,
          }}
        />
      ))}
    </div>
  )
}

function ConstellationDots({ formatId, active }: { formatId: Format; active: boolean }) {
  const points = constellations[formatId]
  if (!active) return null

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Lines between stars */}
      {points.map((pt, i) => {
        if (i === 0) return null
        const prev = points[i - 1]
        return (
          <motion.line
            key={`line-${i}`}
            x1={prev[0]}
            y1={prev[1]}
            x2={pt[0]}
            y2={pt[1]}
            stroke="rgba(201,168,76,0.2)"
            strokeWidth="0.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
          />
        )
      })}
      {/* Star dots */}
      {points.map((pt, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={pt[0]}
          cy={pt[1]}
          r="1"
          fill="rgba(201,168,76,0.8)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        />
      ))}
    </svg>
  )
}

export default function LobbyPage3() {
  const navigate = useNavigate()
  const { user, logoutMutation } = useAuth()
  const [selected, setSelected] = useState<Format | null>(null)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<Format | null>(null)
  const [revealed, setRevealed] = useState(false)
  const curtainRef = useRef<HTMLDivElement>(null)

  const isPremium = user?.isPremium ?? false

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400)
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
        background: 'radial-gradient(ellipse at 20% 0%, #0d1a2e 0%, #060b14 50%, #020507 100%)',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        position: 'relative',
        overflow: 'hidden',
        color: '#e8dcc8',
      }}
    >
      {/* Animated starfield */}
      <StarField />

      {/* Curtain reveal overlay */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            ref={curtainRef}
            initial={{ scaleY: 1, transformOrigin: 'top' }}
            exit={{ scaleY: 0, transformOrigin: 'top' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#020507',
              zIndex: 200,
            }}
          />
        )}
      </AnimatePresence>

      {/* Top-center ornament line */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1px',
          height: '80px',
          background: 'linear-gradient(to bottom, #c9a84c, transparent)',
          zIndex: 5,
          opacity: 0.4,
        }}
      />

      {/* Ambient glow — center */}
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Geometric corner decorations */}
      <svg
        style={{ position: 'fixed', top: 0, left: 0, width: '120px', height: '120px', zIndex: 5, opacity: 0.25, pointerEvents: 'none' }}
        viewBox="0 0 120 120"
      >
        <path d="M0,0 L60,0 L0,60 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        <path d="M0,0 L30,0 L0,30 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="4" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
      </svg>
      <svg
        style={{ position: 'fixed', top: 0, right: 0, width: '120px', height: '120px', zIndex: 5, opacity: 0.25, pointerEvents: 'none' }}
        viewBox="0 0 120 120"
      >
        <path d="M120,0 L60,0 L120,60 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        <path d="M120,0 L90,0 L120,30 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        <circle cx="120" cy="0" r="4" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
      </svg>

      {/* ─────────── HEADER ─────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 36px',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
        }}
      >
        {/* Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => navigate('/lobby3')}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid rgba(201,168,76,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(45deg)',
              flexShrink: 0,
            }}
          >
            <span style={{ transform: 'rotate(-45deg)', color: '#c9a84c', fontSize: '14px', lineHeight: 1 }}>♠</span>
          </div>
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '18px',
              letterSpacing: '0.25em',
              color: '#e8dcc8',
              lineHeight: 1,
              fontWeight: 600,
            }}
          >
            POKERTITAN
          </span>
        </div>

        {/* Right nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* MMR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              padding: '6px 16px',
              border: '1px solid rgba(201,168,76,0.2)',
              background: 'rgba(201,168,76,0.04)',
            }}
          >
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: 'rgba(201,168,76,0.6)',
              }}
            >
              MMR
            </span>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '18px',
                color: user.mmr > 1500 ? '#c9a84c' : '#e8dcc8',
                fontWeight: 600,
              }}
            >
              {user.mmr}
            </span>
          </div>

          {/* Profile */}
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
              transition: 'opacity 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '12px',
                letterSpacing: '0.1em',
                color: isPremium ? '#c9a84c' : '#e8dcc8',
                fontWeight: 400,
              }}
            >
              {user.name}
            </span>
          </button>

          <NavLink onClick={() => navigate('/shop')}>Магазин</NavLink>
          <NavLink onClick={() => logoutMutation.mutate()}>Выйти</NavLink>
        </div>
      </motion.header>

      {/* ─────────── MAIN ─────────── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '56px 20px 100px',
          gap: '48px',
        }}
      >
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.9, ease: 'easeOut' }}
          style={{ textAlign: 'center', maxWidth: '600px' }}
        >
          {/* Ornament above */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4))' }} />
            <span style={{ color: '#c9a84c', fontSize: '16px', opacity: 0.6 }}>✦</span>
            <div style={{ width: '60px', height: '1px', background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.4))' }} />
          </div>

          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(28px, 5vw, 52px)',
              letterSpacing: '0.18em',
              color: '#e8dcc8',
              lineHeight: 1.1,
              fontWeight: 600,
              margin: 0,
            }}
          >
            ВЫБЕРИТЕ ФОРМАТ
          </h1>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: 'rgba(201,168,76,0.55)',
              marginTop: '12px',
              letterSpacing: '0.05em',
              lineHeight: 1.6,
            }}
          >
            Texas Hold'em · Ранговое соперничество
          </p>
        </motion.div>

        {/* Format cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            width: '100%',
            maxWidth: '1040px',
          }}
        >
          {formats.map((f, i) => {
            const locked = f.premium && !isPremium
            const isSelected = selected === f.id
            const isHovered = hovered === f.id

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.12, duration: 0.7, ease: 'easeOut' }}
                style={{ position: 'relative' }}
              >
                <motion.button
                  onClick={() => !locked && setSelected(f.id)}
                  onHoverStart={() => !locked && setHovered(f.id)}
                  onHoverEnd={() => setHovered(null)}
                  animate={{
                    borderColor: isSelected
                      ? 'rgba(201,168,76,0.7)'
                      : isHovered
                      ? 'rgba(201,168,76,0.3)'
                      : 'rgba(201,168,76,0.1)',
                    background: isSelected
                      ? 'rgba(201,168,76,0.06)'
                      : isHovered
                      ? 'rgba(201,168,76,0.03)'
                      : 'rgba(4,10,20,0.6)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(201,168,76,0.1)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    padding: '32px 28px 28px',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    outline: 'none',
                    opacity: locked ? 0.4 : 1,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  {/* Constellation dots (shown on hover/select) */}
                  <ConstellationDots formatId={f.id} active={isSelected || isHovered} />

                  {/* Corner ornament — top left */}
                  <svg
                    style={{ position: 'absolute', top: 0, left: 0, width: '32px', height: '32px', opacity: isSelected ? 0.8 : 0.25 }}
                    viewBox="0 0 32 32"
                  >
                    <path d="M0,0 L20,0 L0,20 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
                  </svg>
                  {/* Corner ornament — bottom right */}
                  <svg
                    style={{ position: 'absolute', bottom: 0, right: 0, width: '32px', height: '32px', opacity: isSelected ? 0.8 : 0.25 }}
                    viewBox="0 0 32 32"
                  >
                    <path d="M32,32 L12,32 L32,12 Z" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
                  </svg>

                  {/* Roman numeral */}
                  <div
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '10px',
                      letterSpacing: '0.3em',
                      color: isSelected ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.25)',
                      marginBottom: '20px',
                      transition: 'color 0.3s',
                    }}
                  >
                    {f.romanNumeral}
                  </div>

                  {/* Card symbol */}
                  <motion.div
                    animate={{
                      color: isSelected ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.15)',
                      scale: isSelected || isHovered ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '24px',
                      fontSize: '40px',
                      lineHeight: 1,
                      userSelect: 'none',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {f.symbol}
                  </motion.div>

                  {/* Format title */}
                  <div
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(22px, 3vw, 30px)',
                      letterSpacing: '0.1em',
                      color: isSelected ? '#e8dcc8' : '#c4b8a4',
                      lineHeight: 1,
                      marginBottom: '4px',
                      fontWeight: 600,
                      transition: 'color 0.3s',
                    }}
                  >
                    {f.title}
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '13px',
                      color: 'rgba(201,168,76,0.5)',
                      letterSpacing: '0.08em',
                      marginBottom: '20px',
                    }}
                  >
                    {f.subtitle}
                  </div>

                  {/* Divider */}
                  <motion.div
                    animate={{
                      background: isSelected
                        ? 'linear-gradient(to right, rgba(201,168,76,0.5), rgba(201,168,76,0.1))'
                        : 'linear-gradient(to right, rgba(201,168,76,0.1), transparent)',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '1px', marginBottom: '16px' }}
                  />

                  {/* Italic description */}
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: 'italic',
                      fontSize: '15px',
                      color: isSelected ? 'rgba(232,220,200,0.7)' : 'rgba(180,168,150,0.4)',
                      lineHeight: 1.65,
                      marginBottom: '24px',
                      transition: 'color 0.3s',
                    }}
                  >
                    {f.italicLine}
                  </div>

                  {/* Bottom stats row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: '10px',
                          letterSpacing: '0.15em',
                          color: 'rgba(232,220,200,0.5)',
                          marginBottom: '2px',
                        }}
                      >
                        {f.players}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '12px',
                          color: 'rgba(201,168,76,0.4)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {f.extra}
                      </div>
                    </div>

                    {f.premium && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          border: '1px solid rgba(201,168,76,0.3)',
                          background: 'rgba(201,168,76,0.06)',
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>{locked ? '🔒' : '✦'}</span>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '9px',
                            letterSpacing: '0.2em',
                            color: '#c9a84c',
                          }}
                        >
                          PREMIUM
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Selected glow bottom border */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(to right, transparent, #c9a84c, transparent)',
                          transformOrigin: 'center',
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        {/* CTA section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
            maxWidth: '400px',
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
                transition={{ duration: 0.25 }}
                style={{ textAlign: 'center' }}
              >
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontSize: '15px',
                    color: 'rgba(201,168,76,0.6)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {selectedFormat?.italicLine}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '10px',
                    letterSpacing: '0.3em',
                    color: 'rgba(201,168,76,0.25)',
                  }}
                >
                  ✦ ВЫБЕРИТЕ ФОРМАТ ВЫШЕ ✦
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Find Game button */}
          <motion.button
            onClick={handleFindGame}
            disabled={!selected || loading}
            animate={{
              opacity: selected && !loading ? 1 : 0.3,
              borderColor: selected && !loading ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.15)',
              background: selected && !loading ? 'rgba(201,168,76,0.1)' : 'transparent',
            }}
            whileHover={selected && !loading ? { background: 'rgba(201,168,76,0.18)', scale: 1.01 } : {}}
            whileTap={selected && !loading ? { scale: 0.99 } : {}}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              padding: '18px 0',
              border: '1px solid rgba(201,168,76,0.15)',
              background: 'transparent',
              color: '#e8dcc8',
              fontFamily: "'Cinzel', serif",
              fontSize: '14px',
              letterSpacing: '0.3em',
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              outline: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                <GoldSpinner />
                <span style={{ letterSpacing: '0.25em', fontSize: '12px', color: 'rgba(201,168,76,0.7)' }}>
                  ПОИСК СОПЕРНИКА
                </span>
              </span>
            ) : (
              <>
                <span style={{ position: 'relative', zIndex: 1 }}>НАЙТИ ИГРУ</span>
                {/* Button corner ornaments */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', opacity: 0.5 }} viewBox="0 0 16 16">
                  <path d="M0,0 L10,0 L0,10 Z" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', opacity: 0.5 }} viewBox="0 0 16 16">
                  <path d="M16,16 L6,16 L16,6 Z" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
                </svg>
              </>
            )}
          </motion.button>
        </motion.div>
      </main>

      {/* Bottom ornament strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '14px',
          borderTop: '1px solid rgba(201,168,76,0.08)',
          background: 'rgba(2,5,7,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {['✦', '♠', '❖', '♥', '◈', '♦', '⬡', '♣', '✦'].map((s, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '12px',
              color: i % 4 === 0 ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)',
              letterSpacing: '0.1em',
            }}
          >
            {s}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/* ─── Utility sub-components ─── */

function NavLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Cinzel', serif",
        fontSize: '11px',
        letterSpacing: '0.15em',
        color: 'rgba(232,220,200,0.35)',
        padding: 0,
        transition: 'color 0.3s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.8)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,220,200,0.35)')}
    >
      {children}
    </button>
  )
}

function GoldSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      style={{
        width: '14px',
        height: '14px',
        border: '1px solid rgba(201,168,76,0.2)',
        borderTopColor: 'rgba(201,168,76,0.8)',
        borderRadius: '50%',
        flexShrink: 0,
      }}
    />
  )
}
