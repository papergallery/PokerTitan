import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchmakingApi } from '../api/matchmaking'
import { Avatar } from '../components/ui/Avatar'

type Format = '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'

interface FormatDef {
  id: Format
  code: string
  title: string
  subtitle: string
  tagline: string
  players: string
  latency: string
  premium: boolean
  accentColor: string
  glowColor: string
  suitSymbol: string
}

const formats: FormatDef[] = [
  {
    id: '1v1',
    code: 'MODE_01',
    title: 'DUEL',
    subtitle: '1v1 · RANKED',
    tagline: 'DIRECT UPLINK. ONE SURVIVOR.',
    players: '2 NODES',
    latency: 'STD MMR',
    premium: false,
    accentColor: '#00e5ff',
    glowColor: 'rgba(0,229,255,0.15)',
    suitSymbol: '♠',
  },
  {
    id: '5-player',
    code: 'MODE_02',
    title: 'ARENA',
    subtitle: '5-PLAYER · TOURNAMENT',
    tagline: 'MULTI-NODE CONFLICT. HIGHEST MMR.',
    players: '5 NODES',
    latency: '×2 MMR',
    premium: false,
    accentColor: '#39ff14',
    glowColor: 'rgba(57,255,20,0.12)',
    suitSymbol: '♦',
  },
  {
    id: '1v1-turbo',
    code: 'MODE_03',
    title: 'TURBO',
    subtitle: '1v1 · OVERCLOCKED',
    tagline: 'REACTION TIME: 10 SEC. NO MERCY.',
    players: '2 NODES',
    latency: '10s CLOCK',
    premium: true,
    accentColor: '#ff0099',
    glowColor: 'rgba(255,0,153,0.15)',
    suitSymbol: '♥',
  },
  {
    id: '5-player-bounty',
    code: 'MODE_04',
    title: 'BOUNTY',
    subtitle: '5-PLAYER · HUNTER PROTOCOL',
    tagline: 'EACH ELIMINATION PAYS. HUNT OR DIE.',
    players: '5 NODES',
    latency: '+MMR/KILL',
    premium: true,
    accentColor: '#ff6b00',
    glowColor: 'rgba(255,107,0,0.15)',
    suitSymbol: '♣',
  },
]

// Scanline effect via CSS background
const scanlinesBg =
  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,200,0.015) 2px, rgba(0,255,200,0.015) 4px)'

// Glitch text hook
function useGlitch(text: string, active: boolean) {
  const [glitched, setGlitched] = useState(text)
  const chars = '!<>-_\\/[]{}—=+*^?#|@$%&ABCDEFabcdef0123456789'

  useEffect(() => {
    if (!active) {
      setGlitched(text)
      return
    }
    let iteration = 0
    const interval = setInterval(() => {
      setGlitched(
        text
          .split('')
          .map((char, idx) => {
            if (char === ' ') return ' '
            if (idx < iteration) return text[idx]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )
      iteration += 0.5
      if (iteration >= text.length) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [active, text])

  return glitched
}

// Animated grid background
function NeonGrid() {
  return (
    <svg
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.07,
      }}
    >
      <defs>
        <pattern id="grid4" width="60" height="60" patternUnits="userSpaceOnUse">
          <path
            d="M 60 0 L 0 0 0 60"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid4)" />
    </svg>
  )
}

// Animated corner brackets for cards
function CornerBrackets({ color, active }: { color: string; active: boolean }) {
  const size = 16
  const thickness = active ? 2 : 1
  const opacity = active ? 0.9 : 0.3
  return (
    <>
      {/* Top-left */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: size + 'px', height: size + 'px', opacity }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M ${size},0 L 0,0 L 0,${size}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Top-right */}
      <svg style={{ position: 'absolute', top: 0, right: 0, width: size + 'px', height: size + 'px', opacity }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M 0,0 L ${size},0 L ${size},${size}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Bottom-left */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: size + 'px', height: size + 'px', opacity }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M 0,0 L 0,${size} L ${size},${size}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Bottom-right */}
      <svg style={{ position: 'absolute', bottom: 0, right: 0, width: size + 'px', height: size + 'px', opacity }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M ${size},0 L ${size},${size} L 0,${size}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
    </>
  )
}

// Blinking cursor
function BlinkCursor({ color = '#00e5ff' }: { color?: string }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'steps(1)' }}
      style={{ display: 'inline-block', width: '8px', height: '1em', background: color, verticalAlign: 'text-bottom', marginLeft: '2px' }}
    />
  )
}

// Terminal boot sequence text
function BootLine({ text, delay, color = 'rgba(0,229,255,0.5)' }: { text: string; delay: number; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '11px',
        color,
        lineHeight: 1.7,
        letterSpacing: '0.05em',
      }}
    >
      {text}
    </motion.div>
  )
}

// Hex pattern for card backgrounds
function HexPattern({ color }: { color: string }) {
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.04,
      }}
    >
      <defs>
        <pattern id={`hex-${color.replace('#', '')}`} x="0" y="0" width="28" height="32" patternUnits="userSpaceOnUse">
          <polygon
            points="14,0 28,8 28,24 14,32 0,24 0,8"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#hex-${color.replace('#', '')})`} />
    </svg>
  )
}

export default function LobbyPage4() {
  const navigate = useNavigate()
  const { user, logoutMutation } = useAuth()
  const [selected, setSelected] = useState<Format | null>(null)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<Format | null>(null)
  const [booted, setBooted] = useState(false)
  const [scanPct, setScanPct] = useState(0)
  const scanRef = useRef(0)

  const isPremium = user?.isPremium ?? false

  // Boot animation
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 1200)
    return () => clearTimeout(t)
  }, [])

  // Animated scanline sweep
  useAnimationFrame((_t: number, delta: number) => {
    scanRef.current = (scanRef.current + delta * 0.03) % 100
    setScanPct(scanRef.current)
  })

  const titleGlitch = useGlitch('POKERTITAN', booted)
  const subtitleGlitch = useGlitch('SELECT GAME MODE', booted)

  async function handleFindGame() {
    if (!selected) return
    setLoading(true)
    try {
      await matchmakingApi.joinQueue(selected)
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
        background: '#050a0e',
        backgroundImage: scanlinesBg,
        fontFamily: "'Share Tech Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
        color: '#c8e6ea',
      }}
    >
      {/* Grid background */}
      <NeonGrid />

      {/* Animated scanline sweep */}
      <div
        style={{
          position: 'fixed',
          top: `${scanPct}%`,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.08), transparent)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Corner decorations - screen frame */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
        {/* Top-left bracket */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '80px', height: '80px', opacity: 0.3 }} viewBox="0 0 80 80">
          <path d="M 60,0 L 0,0 L 0,60" fill="none" stroke="#00e5ff" strokeWidth="1" />
          <path d="M 30,0 L 0,0 L 0,30" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
        </svg>
        {/* Top-right bracket */}
        <svg style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', opacity: 0.3 }} viewBox="0 0 80 80">
          <path d="M 20,0 L 80,0 L 80,60" fill="none" stroke="#00e5ff" strokeWidth="1" />
          <path d="M 50,0 L 80,0 L 80,30" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
        </svg>
        {/* Bottom-left bracket */}
        <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '80px', height: '80px', opacity: 0.3 }} viewBox="0 0 80 80">
          <path d="M 0,20 L 0,80 L 60,80" fill="none" stroke="#00e5ff" strokeWidth="1" />
          <path d="M 0,50 L 0,80 L 30,80" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
        </svg>
        {/* Bottom-right bracket */}
        <svg style={{ position: 'absolute', bottom: 0, right: 0, width: '80px', height: '80px', opacity: 0.3 }} viewBox="0 0 80 80">
          <path d="M 80,20 L 80,80 L 20,80" fill="none" stroke="#00e5ff" strokeWidth="1" />
          <path d="M 80,50 L 80,80 L 50,80" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Ambient glow spots */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-5%',
        width: '500px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(0,229,255,0.04) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-5%',
        width: '600px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(255,0,153,0.04) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Boot overlay */}
      <AnimatePresence>
        {!booted && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: '#050a0e',
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'center',
              padding: '60px',
            }}
          >
            <BootLine text="[SYSTEM] POKERTITAN OS v4.0.1" delay={0} color="rgba(0,229,255,0.9)" />
            <BootLine text="[INIT] Loading game modules..." delay={0.15} />
            <BootLine text="[AUTH] Session validated. Welcome, operator." delay={0.3} color="rgba(57,255,20,0.7)" />
            <BootLine text="[NET] MMR server connected — ping 12ms" delay={0.45} />
            <BootLine text="[READY] Lobby interface online." delay={0.6} color="rgba(0,229,255,0.9)" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}
            >
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'rgba(0,229,255,0.5)' }}>
                {'> '}
              </span>
              <BlinkCursor />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid rgba(0,229,255,0.12)',
          background: 'rgba(5,10,14,0.9)',
          backdropFilter: 'blur(10px)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/lobby4')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: 0,
          }}
        >
          <div style={{
            width: '30px', height: '30px',
            border: '1px solid rgba(0,229,255,0.5)',
            background: 'rgba(0,229,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '16px', color: '#00e5ff' }}>♠</span>
            {/* Corner dots */}
            {[
              { top: '-2px', left: '-2px' },
              { top: '-2px', right: '-2px' },
              { bottom: '-2px', left: '-2px' },
              { bottom: '-2px', right: '-2px' },
            ].map((pos, i) => (
              <div key={i} style={{ position: 'absolute', width: '3px', height: '3px', background: '#00e5ff', ...pos }} />
            ))}
          </div>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#00e5ff',
            textShadow: '0 0 20px rgba(0,229,255,0.5)',
          }}>
            {titleGlitch}
          </span>
        </button>

        {/* Right nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* MMR display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px',
            border: '1px solid rgba(57,255,20,0.3)',
            background: 'rgba(57,255,20,0.05)',
          }}>
            <span style={{ fontSize: '9px', color: 'rgba(57,255,20,0.5)', letterSpacing: '0.15em' }}>MMR</span>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '14px', fontWeight: 600,
              color: '#39ff14',
              textShadow: '0 0 12px rgba(57,255,20,0.6)',
            }}>
              {user.mmr}
            </span>
          </div>

          {/* Profile */}
          <button
            onClick={() => navigate(`/profile/${user.id}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: 0,
              opacity: 1, transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '13px',
              color: isPremium ? '#ff0099' : '#c8e6ea',
              textShadow: isPremium ? '0 0 12px rgba(255,0,153,0.5)' : 'none',
              letterSpacing: '0.04em',
            }}>
              {user.name.toUpperCase()}
            </span>
          </button>

          <NavBtn onClick={() => navigate('/shop')} color="#00e5ff">SHOP</NavBtn>
          <NavBtn onClick={() => logoutMutation.mutate()} color="rgba(0,229,255,0.35)">EXIT</NavBtn>
        </div>
      </motion.header>

      {/* ─── MAIN ─── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 20px 100px',
          gap: '40px',
        }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.4))' }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.2em' }}>
              SYS://LOBBY
            </span>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'linear-gradient(to left, transparent, rgba(0,229,255,0.4))' }} />
          </div>

          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 'clamp(24px, 4vw, 42px)',
            fontWeight: 900,
            letterSpacing: '0.25em',
            color: '#ffffff',
            textShadow: '0 0 30px rgba(0,229,255,0.4), 0 0 60px rgba(0,229,255,0.15)',
            margin: 0,
            lineHeight: 1.1,
          }}>
            {subtitleGlitch}
          </h1>

          <div style={{
            marginTop: '10px',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '12px',
            color: 'rgba(200,230,234,0.35)',
            letterSpacing: '0.15em',
          }}>
            TEXAS HOLD'EM · RANKED MATCHMAKING · v4.0
          </div>
        </motion.div>

        {/* Format cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          width: '100%',
          maxWidth: '1000px',
        }}>
          {formats.map((f, i) => {
            const locked = f.premium && !isPremium
            const isSelected = selected === f.id
            const isHovered = hovered === f.id
            const active = isSelected || isHovered

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.1, duration: 0.4 }}
                style={{ position: 'relative' }}
              >
                <motion.button
                  onClick={() => !locked && setSelected(f.id)}
                  onHoverStart={() => !locked && setHovered(f.id)}
                  onHoverEnd={() => setHovered(null)}
                  animate={{
                    borderColor: isSelected
                      ? f.accentColor
                      : active
                      ? `${f.accentColor}60`
                      : 'rgba(0,229,255,0.1)',
                    background: isSelected
                      ? f.glowColor
                      : active
                      ? 'rgba(0,229,255,0.04)'
                      : 'rgba(5,12,18,0.8)',
                    boxShadow: isSelected
                      ? `0 0 30px ${f.glowColor}, inset 0 0 30px ${f.glowColor}`
                      : active
                      ? `0 0 15px ${f.glowColor}`
                      : 'none',
                  }}
                  transition={{ duration: 0.25 }}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(0,229,255,0.1)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    padding: '24px 22px',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    outline: 'none',
                    opacity: locked ? 0.4 : 1,
                  }}
                >
                  {/* Hex background pattern */}
                  <HexPattern color={f.accentColor} />

                  {/* Corner brackets */}
                  <CornerBrackets color={f.accentColor} active={isSelected} />

                  {/* Top bar — code + suit */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}>
                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: '10px',
                      color: active ? f.accentColor : 'rgba(200,230,234,0.25)',
                      letterSpacing: '0.2em',
                      transition: 'color 0.25s',
                    }}>
                      {f.code}
                    </span>
                    <motion.span
                      animate={{
                        color: active ? f.accentColor : 'rgba(200,230,234,0.1)',
                        textShadow: active ? `0 0 12px ${f.accentColor}` : 'none',
                      }}
                      transition={{ duration: 0.25 }}
                      style={{
                        fontSize: '22px',
                        fontFamily: "'Share Tech Mono', monospace",
                        lineHeight: 1,
                      }}
                    >
                      {f.suitSymbol}
                    </motion.span>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: 'clamp(20px, 3vw, 28px)',
                    fontWeight: 700,
                    color: active ? '#ffffff' : '#8eb0b8',
                    letterSpacing: '0.15em',
                    lineHeight: 1,
                    marginBottom: '6px',
                    textShadow: active ? `0 0 20px ${f.accentColor}` : 'none',
                    transition: 'all 0.25s',
                  }}>
                    {f.title}
                  </div>

                  {/* Subtitle */}
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '11px',
                    color: active ? f.accentColor : 'rgba(200,230,234,0.3)',
                    letterSpacing: '0.12em',
                    marginBottom: '16px',
                    transition: 'color 0.25s',
                  }}>
                    {f.subtitle}
                  </div>

                  {/* Divider */}
                  <motion.div
                    animate={{
                      background: active
                        ? `linear-gradient(to right, ${f.accentColor}, transparent)`
                        : 'linear-gradient(to right, rgba(0,229,255,0.1), transparent)',
                      opacity: active ? 0.8 : 0.4,
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ height: '1px', marginBottom: '14px' }}
                  />

                  {/* Tagline */}
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '11px',
                    color: active ? 'rgba(200,230,234,0.7)' : 'rgba(200,230,234,0.2)',
                    lineHeight: 1.6,
                    letterSpacing: '0.04em',
                    marginBottom: '20px',
                    transition: 'color 0.25s',
                    minHeight: '36px',
                  }}>
                    <span style={{ color: active ? f.accentColor : 'rgba(200,230,234,0.15)' }}>{'> '}</span>
                    {f.tagline}
                  </div>

                  {/* Bottom stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <StatPill label="NODES" value={f.players} color={f.accentColor} active={active} />
                      <StatPill label="REWARD" value={f.latency} color={f.accentColor} active={active} />
                    </div>

                    {f.premium && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px',
                        border: `1px solid ${locked ? 'rgba(255,0,153,0.2)' : 'rgba(255,0,153,0.4)'}`,
                        background: 'rgba(255,0,153,0.06)',
                      }}>
                        <span style={{ fontSize: '9px' }}>{locked ? '🔒' : '◆'}</span>
                        <span style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: '9px',
                          letterSpacing: '0.15em',
                          color: '#ff0099',
                          textShadow: locked ? 'none' : '0 0 8px rgba(255,0,153,0.5)',
                        }}>
                          PREMIUM
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active indicator strip at bottom */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          position: 'absolute',
                          bottom: 0, left: 0, right: 0,
                          height: '2px',
                          background: `linear-gradient(to right, transparent, ${f.accentColor}, transparent)`,
                          boxShadow: `0 0 12px ${f.accentColor}`,
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.4 }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '14px',
            width: '100%', maxWidth: '420px',
          }}
        >
          {/* Status line */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}
              >
                <span style={{ color: 'rgba(57,255,20,0.6)', fontSize: '10px', letterSpacing: '0.1em' }}>
                  {'[SELECTED]'}
                </span>
                <span style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '12px', fontWeight: 600,
                  color: selectedFormat?.accentColor,
                  textShadow: `0 0 10px ${selectedFormat?.accentColor}`,
                  letterSpacing: '0.15em',
                }}>
                  {selectedFormat?.title}
                </span>
                <span style={{ color: 'rgba(200,230,234,0.3)', fontSize: '10px' }}>
                  — {selectedFormat?.tagline}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ color: 'rgba(0,229,255,0.3)', fontSize: '10px', letterSpacing: '0.15em' }}>
                  {'> AWAITING MODE SELECTION'}
                </span>
                <BlinkCursor color="rgba(0,229,255,0.4)" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Find Game button */}
          <motion.button
            onClick={handleFindGame}
            disabled={!selected || loading}
            animate={{
              opacity: selected && !loading ? 1 : 0.3,
              borderColor: selected && !loading
                ? (selectedFormat?.accentColor ?? '#00e5ff')
                : 'rgba(0,229,255,0.1)',
              background: selected && !loading
                ? (selectedFormat?.glowColor ?? 'rgba(0,229,255,0.08)')
                : 'transparent',
              boxShadow: selected && !loading
                ? `0 0 20px ${selectedFormat?.glowColor ?? 'rgba(0,229,255,0.1)'}`
                : 'none',
            }}
            whileHover={selected && !loading ? { scale: 1.01 } : {}}
            whileTap={selected && !loading ? { scale: 0.99 } : {}}
            transition={{ duration: 0.25 }}
            style={{
              width: '100%', padding: '16px 0',
              border: '1px solid rgba(0,229,255,0.1)',
              background: 'transparent',
              color: '#ffffff',
              fontFamily: "'Orbitron', monospace",
              fontSize: '14px', fontWeight: 700,
              letterSpacing: '0.3em',
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              outline: 'none',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <NeonSpinner color={selectedFormat?.accentColor ?? '#00e5ff'} />
                <span style={{ letterSpacing: '0.2em', fontSize: '12px', color: selectedFormat?.accentColor ?? '#00e5ff' }}>
                  SCANNING NETWORK
                </span>
              </span>
            ) : (
              <>
                INITIATE MATCHMAKING
                {/* Button corner marks */}
                {selected && (
                  <>
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px' }} viewBox="0 0 10 10">
                      <path d="M8,0 L0,0 L0,8" fill="none" stroke={selectedFormat?.accentColor} strokeWidth="1.5" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px' }} viewBox="0 0 10 10">
                      <path d="M2,0 L10,0 L10,8" fill="none" stroke={selectedFormat?.accentColor} strokeWidth="1.5" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '10px', height: '10px' }} viewBox="0 0 10 10">
                      <path d="M0,2 L0,10 L8,10" fill="none" stroke={selectedFormat?.accentColor} strokeWidth="1.5" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px' }} viewBox="0 0 10 10">
                      <path d="M10,2 L10,10 L2,10" fill="none" stroke={selectedFormat?.accentColor} strokeWidth="1.5" />
                    </svg>
                  </>
                )}
              </>
            )}
          </motion.button>
        </motion.div>
      </main>

      {/* Status bar footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px',
          borderTop: '1px solid rgba(0,229,255,0.1)',
          background: 'rgba(5,10,14,0.95)',
          backdropFilter: 'blur(10px)',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <StatusDot label="SERVER" color="#39ff14" />
          <StatusDot label="MMR SYNC" color="#00e5ff" />
          <StatusDot label="MATCHMAKER" color="#39ff14" />
        </div>
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '10px',
          color: 'rgba(0,229,255,0.2)',
          letterSpacing: '0.12em',
        }}>
          POKERTITAN_OS · BUILD 4.0.1 · TX_HOLDEM_ENGINE
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {['♠', '♥', '♦', '♣'].map((s, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
              style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: '#00e5ff' }}
            >
              {s}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Sub-components ─── */

function NavBtn({ onClick, children, color }: { onClick: () => void; children: React.ReactNode; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '12px',
        letterSpacing: '0.12em',
        color,
        padding: 0,
        transition: 'color 0.2s, text-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = '#00e5ff'
        e.currentTarget.style.textShadow = '0 0 12px rgba(0,229,255,0.6)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = color
        e.currentTarget.style.textShadow = 'none'
      }}
    >
      {children}
    </button>
  )
}

function StatPill({ label, value, color, active }: { label: string; value: string; color: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '9px',
        color: active ? `${color}70` : 'rgba(200,230,234,0.2)',
        letterSpacing: '0.15em',
        transition: 'color 0.25s',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '11px',
        color: active ? color : 'rgba(200,230,234,0.3)',
        letterSpacing: '0.08em',
        transition: 'color 0.25s',
      }}>
        {value}
      </span>
    </div>
  )
}

function NeonSpinner({ color }: { color: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        width: '14px', height: '14px',
        border: `1px solid ${color}30`,
        borderTopColor: color,
        borderRadius: '50%',
        flexShrink: 0,
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  )
}

function StatusDot({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: '5px', height: '5px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '10px',
        color: 'rgba(200,230,234,0.25)',
        letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </div>
  )
}
