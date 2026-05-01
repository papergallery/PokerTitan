import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../hooks/useGame'
import { socket } from '../lib/socket'
import type { Card, GamePlayer, GameStage, GameAction, GameState } from '../types/game'

// ─── Constants ───────────────────────────────────────────────────────

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

const SUIT_SYMBOLS: Record<string, string> = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' }
const RED_SUITS = new Set(['h', 'd'])

function displayRank(rank: string): string {
  return rank === 'T' ? '10' : rank
}

const STAGE_LABELS: Record<GameStage, string> = {
  waiting: 'ОЖИДАНИЕ',
  'pre-flop': 'PRE-FLOP',
  flop: 'FLOP',
  turn: 'TURN',
  river: 'RIVER',
  showdown: 'SHOWDOWN',
}

const STAGE_ORDER: GameStage[] = ['pre-flop', 'flop', 'turn', 'river', 'showdown']

const CHIP_COLORS = ['#c41e3a', '#d4af37', '#1a6b3c', '#2563eb', '#7c3aed']

// Card sizes — MAXIMALIST: large & readable
const CARD = {
  my: { w: 120, h: 168, mw: 72, mh: 100 },
  opp: { w: 70, h: 98, mw: 52, mh: 72 },
  community: { w: 120, h: 168, mw: 72, mh: 100 },
} as const

const AVATAR_COLORS = ['#7c3aed', '#2563eb', '#059669', '#ea580c', '#db2777', '#0d9488']

// ─── Card Back ──────────────────────────────────────────────────────

function CardBack({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)',
        border: '1px solid #2a2a2a',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 4,
          border: '1px solid #c41e3a33',
          borderRadius: 3,
        }}
      />
      <div
        style={{
          width: '60%',
          height: '70%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(45deg, transparent, transparent 3px, #c41e3a12 3px, #c41e3a12 4px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(-45deg, transparent, transparent 3px, #c41e3a12 3px, #c41e3a12 4px)`,
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: Math.max(width * 0.3, 10),
            color: '#c41e3a44',
            lineHeight: 1,
          }}
        >
          ♠
        </div>
      </div>
      {[
        { top: 5, left: 5 },
        { top: 5, right: 5 },
        { bottom: 5, left: 5 },
        { bottom: 5, right: 5 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: 3,
            height: 3,
            background: '#c41e3a33',
            borderRadius: '50%',
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ─── Card Face ──────────────────────────────────────────────────────

function CardFace({ card, width, height }: { card: Card; width: number; height: number }) {
  const isRed = RED_SUITS.has(card.suit)
  const color = isRed ? '#c41e3a' : '#f5f0e8'
  const rankSize = Math.max(width * 0.4, 14)
  const suitSize = Math.max(width * 0.5, 16)

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(145deg, #1c1c1c 0%, #111 100%)',
        border: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      {/* Top-left rank */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 5,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: rankSize,
          color,
          lineHeight: 1,
        }}
      >
        {displayRank(card.rank)}
      </div>
      {/* Center suit symbol */}
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: suitSize,
          color,
          lineHeight: 1,
        }}
      >
        {SUIT_SYMBOLS[card.suit]}
      </div>
      {/* Bottom-right rank (rotated) */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 5,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: rankSize,
          color,
          lineHeight: 1,
          transform: 'rotate(180deg)',
        }}
      >
        {displayRank(card.rank)}
      </div>
    </div>
  )
}

// ─── Player Card ────────────────────────────────────────────────────

function PlayerCard({ card, isMe, isMobile }: { card: Card | null; isMe: boolean; isMobile: boolean }) {
  const cfg = isMe ? CARD.my : CARD.opp
  const w = isMobile ? cfg.mw : cfg.w
  const h = isMobile ? cfg.mh : cfg.h

  if (!card) return <CardBack width={w} height={h} />
  return <CardFace card={card} width={w} height={h} />
}

// ─── Chip Icon (decorative) ──────────────────────────────────────────

function ChipIcon({ size }: { size: number }) {
  const r = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="cg" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="100%" stopColor="#a8891c" />
        </radialGradient>
      </defs>
      {/* Base circle */}
      <circle cx={r} cy={r} r={r - 1} fill="url(#cg)" stroke="#d4af3788" strokeWidth={1.2} />
      {/* Inner ring */}
      <circle cx={r} cy={r} r={r * 0.65} fill="none" stroke="#fff3" strokeWidth={1} />
      {/* Edge notches (4 dashes) */}
      {[0, 90, 180, 270].map(deg => (
        <line
          key={deg}
          x1={r} y1={1.5}
          x2={r} y2={size * 0.18}
          stroke="#fff4"
          strokeWidth={size * 0.12}
          strokeLinecap="round"
          transform={`rotate(${deg} ${r} ${r})`}
        />
      ))}
      {/* Center diamond */}
      <text
        x={r} y={r}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0008"
        fontSize={size * 0.38}
        fontFamily="serif"
      >
        ◆
      </text>
    </svg>
  )
}

// ─── Bet Chip ───────────────────────────────────────────────────────

function formatChips(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function BetChip({ amount, isMobile }: { amount: number; isMobile: boolean }) {
  if (amount <= 0) return null
  const size = isMobile ? 54 : 66
  const r = size / 2
  const colorIdx = Math.floor(amount / 100) % CHIP_COLORS.length
  const chipColor = CHIP_COLORS[colorIdx]

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer shadow ring */}
        <circle cx={r} cy={r} r={r - 1} fill={`${chipColor}cc`} stroke={`${chipColor}`} strokeWidth={2} />
        {/* Inner lighter ring */}
        <circle cx={r} cy={r} r={r * 0.78} fill="none" stroke={`${chipColor}55`} strokeWidth={1.5} />
        <circle cx={r} cy={r} r={r * 0.62} fill="none" stroke={`${chipColor}55`} strokeWidth={1.5} />
        {/* Edge notches — 8 evenly spaced */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <line
            key={deg}
            x1={r} y1={2}
            x2={r} y2={size * 0.14}
            stroke="#ffffff44"
            strokeWidth={size * 0.08}
            strokeLinecap="round"
            transform={`rotate(${deg} ${r} ${r})`}
          />
        ))}
        {/* Center fill for text readability */}
        <circle cx={r} cy={r} r={r * 0.48} fill={`${chipColor}dd`} stroke="#ffffff18" strokeWidth={1} />
        {/* Amount text */}
        <text
          x={r}
          y={r}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f5f0e8"
          fontSize={isMobile ? 24 : 28}
          fontFamily="'Bebas Neue', sans-serif"
          fontWeight="700"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' } as React.CSSProperties}
        >
          {formatChips(amount)}
        </text>
      </svg>
    </motion.div>
  )
}

// ─── Timer Ring ─────────────────────────────────────────────────────

function TimerRing({ timeLeft, total = 30, size }: { timeLeft: number; total?: number; size: number }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (timeLeft / total) * circumference
  const color = timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#d4af37' : '#c41e3a'

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e1e1e" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: size * 0.38,
          color,
          letterSpacing: '0.02em',
        }}
      >
        {timeLeft}
      </span>
    </div>
  )
}

// ─── Player Avatar ──────────────────────────────────────────────────

function PlayerAvatar({ name, avatarUrl, size }: { name: string; avatarUrl?: string; size: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: AVATAR_COLORS[colorIdx],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: '#fff',
      }}
    >
      {initials}
    </div>
  )
}

// ─── Position Badge (D / SB / BB) ───────────────────────────────────

const POSITION_NAMES: Record<string, string> = { D: 'DEALER', SB: 'SM BLIND', BB: 'BIG BLIND' }

function PositionBadge({ label, color, isMobile }: { label: string; color: string; isMobile: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 5 : 7,
        background: `${color}25`,
        border: `1.5px solid ${color}88`,
        borderRadius: 5,
        padding: isMobile ? '3px 8px' : '4px 12px',
        flexShrink: 0,
      }}
    >
      <span style={{
        width: isMobile ? 8 : 10,
        height: isMobile ? 8 : 10,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}88`,
      }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: isMobile ? 11 : 14,
        fontWeight: 700,
        color: '#f5f0e8',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        {POSITION_NAMES[label] ?? label}
      </span>
    </div>
  )
}

// ─── Stage Indicator ────────────────────────────────────────────────

function StageIndicator({ stage, isMobile }: { stage: GameStage; isMobile: boolean }) {
  const currentIdx = STAGE_ORDER.indexOf(stage)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 5 }}>
      {STAGE_ORDER.map((s, i) => {
        const isActive = i === currentIdx
        const isPast = i < currentIdx

        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 5 }}>
            <motion.div
              animate={{
                background: isActive ? '#c41e3a' : isPast ? '#c41e3a55' : '#1e1e1e',
              }}
              style={{
                padding: isMobile ? '4px 10px' : '6px 16px',
                borderRadius: 4,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: isMobile ? 13 : 20,
                letterSpacing: '0.12em',
                color: isActive ? '#f5f0e8' : isPast ? '#c41e3a88' : '#444',
                border: isActive ? '1px solid #c41e3a' : '1px solid transparent',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {STAGE_LABELS[s]}
            </motion.div>
            {i < STAGE_ORDER.length - 1 && (
              <div
                style={{
                  width: isMobile ? 10 : 20,
                  height: 2,
                  background: isPast ? '#c41e3a55' : '#1e1e1e',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Community Cards Area ───────────────────────────────────────────

function CommunityCardsArea({
  cards,
  pot,
  stage,
  isMobile,
}: {
  cards: Card[]
  pot: number
  stage: GameStage
  isMobile: boolean
}) {
  const cardW = isMobile ? CARD.community.mw : CARD.community.w
  const cardH = isMobile ? CARD.community.mh : CARD.community.h

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isMobile ? 8 : 14,
      }}
    >
      <StageIndicator stage={stage} isMobile={isMobile} />

      {/* Cards row */}
      <div style={{ display: 'flex', gap: isMobile ? 5 : 8, justifyContent: 'center' }}>
        {cards.map((card, i) => (
          <motion.div
            key={`${displayRank(card.rank)}${card.suit}-${i}`}
            initial={{ opacity: 0, y: -20, rotateY: 180 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ delay: i * 0.12, duration: 0.4, ease: 'easeOut' }}
          >
            <CardFace card={card} width={cardW} height={cardH} />
          </motion.div>
        ))}
        {Array.from({ length: 5 - cards.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              width: cardW,
              height: cardH,
              borderRadius: 6,
              border: '1px dashed #2a2a2a44',
              background: 'rgba(10,10,10,0.3)',
            }}
          />
        ))}
      </div>

      {/* Pot — HUGE */}
      {pot > 0 && (
        <motion.div
          key={pot}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMobile ? 22 : 32,
              letterSpacing: '0.12em',
              color: '#d4af37',
            }}
          >
            POT
          </span>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMobile ? 24 : 36,
              letterSpacing: '0.05em',
              color: '#d4af37',
              textShadow: '0 0 24px #d4af3755',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 5 : 8,
            }}
          >
            {pot}
            <ChipIcon size={isMobile ? 18 : 24} />
          </span>
        </motion.div>
      )}
    </div>
  )
}

// ─── Player Seat ────────────────────────────────────────────────────

function PlayerSeat({
  player,
  isCurrentTurn,
  isMe,
  timeLeft,
  isMobile,
  positionLabel,
}: {
  player: GamePlayer
  isCurrentTurn: boolean
  isMe: boolean
  timeLeft: number
  isMobile: boolean
  positionLabel?: 'D' | 'SB' | 'BB'
}) {
  const isFolded = player.status === 'folded'
  const isEliminated = player.status === 'eliminated'
  const isAllIn = player.status === 'all-in'
  const dimmed = isFolded || isEliminated

  const avatarSize = isMobile ? 48 : 64
  const timerSize = isMobile ? 44 : 56

  const posColor =
    positionLabel === 'D'
      ? '#f5f0e8'
      : positionLabel === 'SB'
        ? '#7c3aed'
        : '#c41e3a'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: isMobile ? 4 : 6,
        opacity: dimmed ? 0.3 : 1,
        transition: 'opacity 0.3s',
        position: 'relative',
      }}
    >
      {/* Top row: [Avatar] [Info + Badge] — timer absolute */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, position: 'relative' }}>
        {/* Avatar — left, aligned with left card edge */}
        <div style={{
          padding: 3,
          borderRadius: '50%',
          border: isCurrentTurn ? '2px solid #c41e3a' : '2px solid transparent',
          boxShadow: isCurrentTurn ? '0 0 18px #c41e3a44' : 'none',
          transition: 'all 0.3s',
          flexShrink: 0,
        }}>
          <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size={avatarSize} />
        </div>

        {/* Info: name+chips, badge — compact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 5 : 7 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: isMe ? (isMobile ? 14 : 18) : (isMobile ? 13 : 16),
              fontWeight: 700,
              color: player.isPremium ? '#d4af37' : isMe ? '#f5f0e8' : '#aaa',
              letterSpacing: '0.06em',
            }}>
              {isMe ? 'YOU' : player.name.toUpperCase()}
            </span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMe ? (isMobile ? 20 : 28) : (isMobile ? 18 : 26),
              color: '#d4af37',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 3 : 5,
            }}>
              {formatChips(player.chips)}
              <ChipIcon size={isMe ? (isMobile ? 16 : 20) : (isMobile ? 14 : 18)} />
            </span>
          </div>
          {positionLabel && (
            <PositionBadge label={positionLabel} color={posColor} isMobile={isMobile} />
          )}
        </div>

        {/* Timer — absolute, same level as avatar, same size, doesn't shift layout */}
        {isCurrentTurn && (
          <div style={{ position: 'absolute', right: -(avatarSize + (isMobile ? 14 : 20)), top: 0 }}>
            <TimerRing timeLeft={timeLeft} size={avatarSize} />
          </div>
        )}
      </div>

      {/* Cards below, aligned left with avatar */}
      <div style={{ display: 'flex', gap: isMobile ? 3 : 5 }}>
        {player.cards.map((card, i) => (
          <motion.div
            key={i}
            initial={isMe ? { rotateY: 180 } : undefined}
            animate={isMe ? { rotateY: 0 } : undefined}
            transition={isMe ? { delay: 0.2 + i * 0.15, duration: 0.4 } : undefined}
          >
            <PlayerCard card={card} isMe={isMe} isMobile={isMobile} />
          </motion.div>
        ))}
      </div>

      {/* Status badges */}
      {isAllIn && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 11 : 13,
            letterSpacing: '0.15em',
            color: '#c41e3a',
            border: '1px solid #c41e3a55',
            padding: '2px 10px',
            background: '#c41e3a11',
            borderRadius: 3,
          }}
        >
          ALL-IN
        </motion.div>
      )}

      {isFolded && (
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 11 : 13, letterSpacing: '0.15em', color: '#555' }}>
          FOLD
        </div>
      )}

      {isEliminated && (
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? 11 : 13, letterSpacing: '0.15em', color: '#333' }}>
          OUT
        </div>
      )}
    </div>
  )
}

// ─── Action Panel ───────────────────────────────────────────────────

function GameActionPanel({
  currentBet,
  lastRaiseIncrement,
  myChips,
  myBet,
  onAction,
  isMobile,
}: {
  currentBet: number
  lastRaiseIncrement: number
  myChips: number
  myBet: number
  onAction: (action: GameAction, amount?: number) => void
  isMobile: boolean
}) {
  const maxRaise = myChips + myBet
  const minRaise = Math.min(currentBet + lastRaiseIncrement, maxRaise)
  const [raiseAmount, setRaiseAmount] = useState(minRaise)
  const toCall = Math.max(0, currentBet - myBet)
  const canCheck = toCall === 0

  useEffect(() => {
    setRaiseAmount(minRaise)
  }, [minRaise])

  const btnHeight = isMobile ? 50 : 64
  const btnFont = isMobile ? 18 : 26

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 10 : 14,
        background: '#111',
        border: '1px solid #1e1e1e',
        borderBottom: 'none',
        padding: isMobile ? '14px 16px 20px' : '20px 28px 28px',
        borderRadius: '8px 8px 0 0',
      }}
    >
      {/* Fold / Check|Call row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onAction('fold')}
          style={{
            flex: 1,
            height: btnHeight,
            background: 'transparent',
            border: '1px solid #2a2a2a',
            borderRadius: 4,
            color: '#888',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: btnFont,
            letterSpacing: '0.15em',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#555'
            e.currentTarget.style.color = '#f5f0e8'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#888'
          }}
        >
          FOLD
        </button>
        {canCheck ? (
          <button
            onClick={() => onAction('check')}
            style={{
              flex: 1,
              height: btnHeight,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#f5f0e8',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: btnFont,
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#222')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
          >
            CHECK
          </button>
        ) : (
          <button
            onClick={() => onAction('call')}
            style={{
              flex: 1,
              height: btnHeight,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#f5f0e8',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: btnFont,
              letterSpacing: '0.15em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#222')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}
          >
            CALL {toCall}
          </button>
        )}
      </div>

      {/* Raise section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: isMobile ? 11 : 12,
            letterSpacing: '0.08em',
            color: '#666',
            padding: '0 2px',
          }}
        >
          <span>RAISE: <span style={{ color: '#c41e3a' }}>{raiseAmount}</span></span>
          <span>MAX: {maxRaise}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center', flex: 1 }}>
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={10}
              value={Math.min(raiseAmount, maxRaise)}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #c41e3a ${((raiseAmount - minRaise) / (maxRaise - minRaise || 1)) * 100}%, #1e1e1e ${((raiseAmount - minRaise) / (maxRaise - minRaise || 1)) * 100}%)`,
                outline: 'none',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            />
          </div>
          {!isMobile && (
            <input
              type="number"
              min={minRaise}
              max={maxRaise}
              step={10}
              value={raiseAmount}
              onChange={e => {
                const v = Number(e.target.value)
                if (!isNaN(v)) setRaiseAmount(Math.max(minRaise, Math.min(maxRaise, v)))
              }}
              onBlur={() => {
                setRaiseAmount(prev => Math.max(minRaise, Math.min(maxRaise, Math.round(prev / 10) * 10)))
              }}
              style={{
                width: 80,
                height: 32,
                background: '#0d0d0d',
                border: '1px solid #1e1e1e',
                borderRadius: 3,
                color: '#c41e3a',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                textAlign: 'center',
                outline: 'none',
                caretColor: '#c41e3a',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#c41e3a55')}
            />
          )}
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0.5, 0.75, 1].map(mult => {
            const val = Math.min(Math.max(Math.round(maxRaise * mult / 10) * 10, minRaise), maxRaise)
            return (
              <button
                key={mult}
                onClick={() => setRaiseAmount(val)}
                style={{
                  flex: 1,
                  height: isMobile ? 36 : 40,
                  background: '#0d0d0d',
                  border: '1px solid #1e1e1e',
                  borderRadius: 3,
                  color: '#666',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: isMobile ? 11 : 13,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#c41e3a55'
                  e.currentTarget.style.color = '#c41e3a'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1e1e1e'
                  e.currentTarget.style.color = '#666'
                }}
              >
                {mult === 1 ? 'ALL-IN' : `${mult * 100}%`}
              </button>
            )
          })}
        </div>

        {/* Raise button — full width, BIG */}
        <button
          onClick={() => onAction('raise', raiseAmount)}
          style={{
            width: '100%',
            height: isMobile ? 50 : 64,
            background: '#c41e3a',
            border: '1px solid #c41e3a',
            borderRadius: 4,
            color: '#f5f0e8',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 20 : 28,
            letterSpacing: '0.2em',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#a01830')}
          onMouseLeave={e => (e.currentTarget.style.background = '#c41e3a')}
        >
          RAISE {raiseAmount}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Winner Reveal Overlay ──────────────────────────────────────────

function WinnerReveal({
  winnerName,
  pot,
  winningHand,
  isMobile,
}: {
  winnerName: string
  pot: number
  winningHand?: string
  isMobile: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        pointerEvents: 'none',
        borderRadius: '50%',
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? 6 : 10,
        }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          style={{
            width: isMobile ? 140 : 220,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
          }}
        />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 30 : 46,
            letterSpacing: '0.12em',
            color: '#d4af37',
            textShadow: '0 0 30px #d4af3766',
            textAlign: 'center',
          }}
        >
          {winnerName.toUpperCase()} WINS
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 20 : 28,
            letterSpacing: '0.1em',
            color: '#d4af37aa',
          }}
        >
          +{pot}
        </motion.div>
        {winningHand && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: isMobile ? 11 : 13,
              letterSpacing: '0.15em',
              color: '#888',
              textTransform: 'uppercase',
            }}
          >
            {winningHand}
          </motion.div>
        )}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
          style={{
            width: isMobile ? 140 : 220,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ─── Table Seat Positions ───────────────────────────────────────────

type ChipDirection = 'bottom' | 'top' | 'right' | 'left'
interface SeatPosition {
  left: string
  top?: string
  bottom?: string
  chipDir: ChipDirection  // direction of bet chip (toward center of table)
}

function useTablePositions(opponentCount: number): SeatPosition[] {
  return useMemo(() => {
    if (opponentCount === 0) return []

    // 1v1: handled separately outside ellipse
    if (opponentCount === 1) {
      return [{ left: '50%', top: '0%', chipDir: 'bottom' as ChipDirection }]
    }

    // 2 opponents
    if (opponentCount === 2) {
      return [
        { left: '20%', top: '5%', chipDir: 'bottom' },
        { left: '80%', top: '5%', chipDir: 'bottom' },
      ]
    }

    // 3 opponents
    if (opponentCount === 3) {
      return [
        { left: '5%', top: '45%', chipDir: 'right' },
        { left: '50%', top: '0%', chipDir: 'bottom' },
        { left: '95%', top: '45%', chipDir: 'left' },
      ]
    }

    // 4 opponents (5-player game)
    return [
      { left: '5%', top: '45%', chipDir: 'right' },    // Opp 1 — left side
      { left: '27%', top: '0%', chipDir: 'bottom' },    // Opp 2 — top-left
      { left: '73%', top: '0%', chipDir: 'bottom' },    // Opp 3 — top-right
      { left: '95%', top: '45%', chipDir: 'left' },     // Opp 4 — right side
    ]
  }, [opponentCount])
}

// ─── Loading Dots ───────────────────────────────────────────────────

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          style={{
            width: 5,
            height: 5,
            background: '#c41e3a',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}

// ─── Main GamePage ──────────────────────────────────────────────────

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tournamentId = id ? parseInt(id, 10) : null
  const { gameState, lastResult, gameEnd, isMyTurn, timeLeft, sendAction } = useGame(tournamentId)

  const format = (location.state as { format?: string })?.format ?? ''
  const isTurbo = format === '1v1-turbo'
  const isBounty = format === '5-player-bounty'

  const [bountyMsg, setBountyMsg] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [winnerData, setWinnerData] = useState<{
    name: string
    pot: number
    hand?: string
  } | null>(null)

  // Mobile detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Bounty kill listener
  useEffect(() => {
    if (!isBounty) return

    socket.on('bounty:kill', (data: { killerId: number; eliminated: number[]; bonus: number }) => {
      if (gameState && data.killerId === gameState.myUserId) {
        setBountyMsg(`+${data.bonus} MMR`)
        setTimeout(() => setBountyMsg(null), 3000)
      }
    })

    return () => {
      socket.off('bounty:kill')
    }
  }, [isBounty, gameState])

  // Winner reveal animation
  useEffect(() => {
    if (!lastResult || !gameState) return

    const winner = gameState.players.find(p => p.userId === lastResult.winnerId)
    if (winner) {
      setWinnerData({
        name: winner.userId === gameState.myUserId ? 'YOU' : winner.name,
        pot: lastResult.pot,
        hand: lastResult.winningHand ?? lastResult.handName,
      })
      setShowWinner(true)
      const timer = setTimeout(() => setShowWinner(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [lastResult])

  const myPlayer = gameState?.players.find(p => p.userId === gameState.myUserId)
  const opponents = gameState?.players.filter(p => p.userId !== gameState.myUserId) ?? []

  const getPositionLabel = (userId: number): 'D' | 'SB' | 'BB' | undefined => {
    if (!gameState) return undefined
    if (userId === gameState.dealerUserId) return 'D'
    if (userId === gameState.sbUserId) return 'SB'
    if (userId === gameState.bbUserId) return 'BB'
    return undefined
  }

  const seatPositions = useTablePositions(opponents.length)

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

      {/* Red accent lines */}
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

      {/* Corner vignettes */}
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

      {/* Bounty toast */}
      <AnimatePresence>
        {bountyMsg && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              background: '#d4af37',
              color: '#0a0a0a',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMobile ? 16 : 18,
              letterSpacing: '0.1em',
              padding: '8px 20px',
              boxShadow: '0 0 20px #d4af3766',
            }}
          >
            {bountyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turbo badge */}
      {isTurbo && gameState && (
        <div
          style={{
            position: 'absolute',
            top: isMobile ? 8 : 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
            background: '#c41e3a',
            color: '#f5f0e8',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 11 : 14,
            letterSpacing: '0.15em',
            padding: '3px 12px',
            borderRadius: 3,
          }}
        >
          TURBO · 10 SEC
        </div>
      )}

      {/* Surrender button */}
      {gameState && (
        <button
          onClick={() => {
            if (window.confirm('Сдаться? Вы потеряете все фишки и проиграете.')) {
              socket.emit('game:surrender')
            }
          }}
          style={{
            position: 'absolute',
            top: isMobile ? 8 : 12,
            right: isMobile ? 8 : 16,
            zIndex: 15,
            background: 'transparent',
            border: '1px solid #333',
            color: '#666',
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? 11 : 13,
            letterSpacing: '0.1em',
            padding: isMobile ? '4px 10px' : '5px 14px',
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#c41e3a'
            e.currentTarget.style.color = '#c41e3a'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#333'
            e.currentTarget.style.color = '#666'
          }}
        >
          СДАТЬСЯ
        </button>
      )}

      {/* ─── POKER TABLE AREA — fills entire screen ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '10px 6px 4px' : '16px 20px 8px',
          zIndex: 10,
        }}
      >
        {gameState ? (
          <div
            style={{
              width: '100%',
              maxWidth: 1400,
              height: isMobile ? '85vh' : '90vh',
              position: 'relative',
            }}
          >
            {/* Outer glow / shadow layer */}
            <div
              style={{
                position: 'absolute',
                left: isMobile ? '3%' : '5%',
                right: isMobile ? '3%' : '5%',
                top: isMobile ? '2%' : '15%',
                bottom: isMobile ? '4%' : '15%',
                borderRadius: '50%',
                background: 'transparent',
                boxShadow: '0 0 80px 20px rgba(10,10,10,0.8), 0 0 120px 40px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            />

            {/* ─── THE TABLE ELLIPSE — positioning parent for ALL elements ─── */}
            {/* Desktop: wide horizontal oval (small left/right inset, large top/bottom) */}
            {/* Mobile: tall vertical oval (large left/right inset, small top/bottom) */}
            <div
              style={{
                position: 'absolute',
                left: isMobile ? '5%' : '5%',
                right: isMobile ? '5%' : '5%',
                top: isMobile ? '2%' : '14%',
                bottom: isMobile ? '5%' : '14%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 50% 45%, #181818 0%, #141414 40%, #111111 70%, #0e0e0e 100%)',
                border: '2px solid #333',
                boxShadow: `
                  inset 0 0 60px 20px rgba(0,0,0,0.5),
                  inset 0 2px 30px rgba(196,30,58,0.03),
                  0 4px 30px rgba(0,0,0,0.6)
                `,
                overflow: 'visible',
              }}
            >
              {/* Inner rail */}
              <div
                style={{
                  position: 'absolute',
                  inset: isMobile ? 6 : 12,
                  borderRadius: '50%',
                  border: '1px solid #2a2a2a',
                  pointerEvents: 'none',
                }}
              />

              {/* Subtle center decoration */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '25%',
                  right: '25%',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, #1e1e1e, transparent)',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Opponents rendered outside ellipse for consistent centering */}

              {/* ─── COMMUNITY CARDS + POT — center of ellipse ─── */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '46%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 11,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <CommunityCardsArea
                    cards={gameState.communityCards}
                    pot={gameState.pot}
                    stage={gameState.stage}
                    isMobile={isMobile}
                  />
                </motion.div>
              </div>

              {/* Winner reveal overlay */}
              <AnimatePresence>
                {showWinner && winnerData && (
                  <WinnerReveal
                    winnerName={winnerData.name}
                    pot={winnerData.pot}
                    winningHand={winnerData.hand}
                    isMobile={isMobile}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ─── ALL OPPONENTS — positioned in TABLE CONTAINER ─── */}
            {opponents.map((player, i) => {
              const pos = seatPositions[i]
              if (!pos) return null

              const chipDir = pos.chipDir
              // Chip margin styles based on direction toward center
              const chipStyle: React.CSSProperties = chipDir === 'bottom'
                ? { marginTop: isMobile ? 16 : 28 }
                : chipDir === 'top'
                  ? { marginBottom: isMobile ? 16 : 28 }
                  : chipDir === 'right'
                    ? { marginLeft: isMobile ? 16 : 28 }
                    : { marginRight: isMobile ? 16 : 28 }

              // For side positions, use row layout for chip
              const isSide = chipDir === 'left' || chipDir === 'right'

              return (
                <div
                  key={player.userId}
                  style={{
                    position: 'absolute',
                    left: pos.left,
                    top: pos.top,
                    bottom: pos.bottom,
                    transform: 'translateX(-50%)',
                    zIndex: 15,
                    display: 'flex',
                    flexDirection: isSide ? 'row' : 'column',
                    alignItems: 'center',
                    gap: 0,
                  }}
                >
                  {/* Chip before player for top/left directions */}
                  {player.bet > 0 && (chipDir === 'top' || chipDir === 'left') && (
                    <div style={chipStyle}>
                      <BetChip amount={player.bet} isMobile={isMobile} />
                    </div>
                  )}

                  <PlayerSeat
                    player={player}
                    isCurrentTurn={player.userId === gameState.currentPlayerId}
                    isMe={false}
                    timeLeft={player.userId === gameState.currentPlayerId ? timeLeft : 30}
                    isMobile={isMobile}
                    positionLabel={getPositionLabel(player.userId)}
                  />

                  {/* Chip after player for bottom/right directions */}
                  {player.bet > 0 && (chipDir === 'bottom' || chipDir === 'right') && (
                    <div style={chipStyle}>
                      <BetChip amount={player.bet} isMobile={isMobile} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* ─── MY PLAYER — bottom center of TABLE CONTAINER (not ellipse) ─── */}
            {myPlayer && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: isMobile ? '0%' : '0%',
                  transform: 'translateX(-50%)',
                  zIndex: 15,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: isMobile ? 3 : 5,
                }}
              >
                {myPlayer.bet > 0 && (
                  <div style={{ marginBottom: isMobile ? 28 : 48 }}>
                    <BetChip amount={myPlayer.bet} isMobile={isMobile} />
                  </div>
                )}
                <PlayerSeat
                  player={myPlayer}
                  isCurrentTurn={myPlayer.userId === gameState.currentPlayerId}
                  isMe={true}
                  timeLeft={myPlayer.userId === gameState.currentPlayerId ? timeLeft : 30}
                  isMobile={isMobile}
                  positionLabel={getPositionLabel(myPlayer.userId)}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 22,
                  letterSpacing: '0.2em',
                  color: '#333',
                }}
              >
                ЗАГРУЗКА ИГРЫ
              </div>
              <LoadingDots />
            </motion.div>
          </div>
        )}
      </div>

      {/* ─── Action Panel — desktop: right side overlay, mobile: bottom ─── */}
      <AnimatePresence>
        {isMyTurn && myPlayer && gameState && myPlayer.status === 'active' && (
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : 40, y: isMobile ? 60 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMobile ? 0 : 40, y: isMobile ? 60 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={isMobile ? {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              maxWidth: 500,
              margin: '0 auto',
            } : {
              position: 'fixed',
              right: 24,
              bottom: 24,
              width: 380,
              zIndex: 20,
            }}
          >
            <GameActionPanel
              currentBet={gameState.currentBet}
              lastRaiseIncrement={gameState.lastRaiseIncrement}
              myChips={myPlayer.chips}
              myBet={myPlayer.bet}
              onAction={sendAction}
              isMobile={isMobile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Game End Modal ─── */}
      <AnimatePresence>
        {gameEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                padding: isMobile ? '28px 20px' : '40px 32px',
                width: '100%',
                maxWidth: 400,
                margin: '0 16px',
                position: 'relative',
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #c41e3a, transparent)',
                  borderRadius: '6px 6px 0 0',
                }}
              />

              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: isMobile ? 26 : 32,
                  letterSpacing: '0.1em',
                  color: '#f5f0e8',
                  textAlign: 'center',
                  marginBottom: 28,
                }}
              >
                ТУРНИР ЗАВЕРШЁН
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {gameEnd.places.map((p, i) => (
                  <motion.div
                    key={p.userId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: i < gameEnd.places.length - 1 ? '1px solid #1e1e1e' : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: p.place === 1 ? '#d4af37' : '#999',
                        fontSize: 14,
                        letterSpacing: '0.05em',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: 18,
                          marginRight: 8,
                          color: p.place === 1 ? '#d4af37' : '#555',
                        }}
                      >
                        #{p.place}
                      </span>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 20,
                        letterSpacing: '0.05em',
                        color: p.mmrChange >= 0 ? '#c41e3a' : '#555',
                      }}
                    >
                      {p.mmrChange >= 0 ? '+' : ''}
                      {p.mmrChange} MMR
                    </span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => navigate('/lobby')}
                style={{
                  width: '100%',
                  padding: '18px 0',
                  background: '#c41e3a',
                  border: '1px solid #c41e3a',
                  borderRadius: 4,
                  color: '#f5f0e8',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: isMobile ? 20 : 24,
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

      {/* Slider accent color style injection */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          background: #c41e3a;
          border: 2px solid #f5f0e8;
          cursor: pointer;
          margin-top: -8px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          background: #c41e3a;
          border: 2px solid #f5f0e8;
          cursor: pointer;
          border-radius: 0;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
        }
        input[type="range"]::-moz-range-track {
          height: 6px;
          background: #1e1e1e;
        }
      `}</style>
    </div>
  )
}
