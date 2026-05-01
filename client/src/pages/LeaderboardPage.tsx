import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/* ─── noise texture (reused from project pattern) ─── */
const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

/* ─── types ─── */
interface LeaderboardPlayer {
  rank: number
  userId: number
  name: string
  mmr: number
  avatarUrl: string | null
  isPremium: boolean
}

interface LeaderboardResponse {
  players: LeaderboardPlayer[]
  page: number
  totalPages: number
  total: number
}

/* ─── constants ─── */
const BG = '#0a0a0a'
const SURFACE_HOVER = '#1a1a1a'
const ACCENT = '#c41e3a'
const GOLD = '#d4af37'
const SILVER = '#aaa'
const BRONZE = '#cd7f32'
const TEXT = '#f5f0e8'
const MUTED = '#666'

const RANK_COLORS: Record<number, string> = { 1: GOLD, 2: SILVER, 3: BRONZE }
const RANK_LABELS: Record<number, string> = { 1: '\u265B', 2: '\u2655', 3: '\u2657' }

/* ─── helper: avatar fallback ─── */
function PlayerAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const hue = name.charCodeAt(0) * 37 % 360

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hue}, 40%, 30%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: TEXT,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

/* ─── pagination helpers ─── */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total)
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }

  return pages
}

/* ─── main component ─── */
export default function LeaderboardPage() {
  const navigate = useNavigate()
  const { user: me } = useAuth()

  const [page, setPage] = useState(1)
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  /* mobile detection */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* fetch leaderboard */
  const fetchLeaderboard = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/stats/leaderboard?page=${p}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Не удалось загрузить лидерборд')
      const json: LeaderboardResponse = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(page)
  }, [page, fetchLeaderboard])

  /* ─── styles ─── */
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: BG,
    backgroundImage: noiseSVG,
    color: TEXT,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: isMobile ? '24px 12px 48px' : '48px 24px 64px',
  }

  const innerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 800,
  }

  /* ─── render ─── */
  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate('/lobby')}
          style={{
            background: 'none',
            border: 'none',
            color: MUTED,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.15em',
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          whileHover={{ color: TEXT }}
        >
          <span style={{ fontSize: 16 }}>{'\u2190'}</span> ЛОББИ
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 40 }}
        >
          <h1
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: isMobile ? 48 : 72,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '0.04em',
              color: TEXT,
              position: 'relative',
            }}
          >
            LEADERBOARD
            <span
              style={{
                display: 'block',
                width: 48,
                height: 3,
                background: ACCENT,
                marginTop: 12,
                borderRadius: 2,
              }}
            />
          </h1>

          {data && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: MUTED,
                letterSpacing: '0.2em',
                marginTop: 16,
              }}
            >
              {data.total} ИГРОКОВ В РЕЙТИНГЕ
            </motion.p>
          )}
        </motion.div>

        {/* Loading state */}
        {loading && !data && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 80,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.2em',
              color: MUTED,
            }}
          >
            ЗАГРУЗКА...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: ACCENT,
              letterSpacing: '0.1em',
            }}
          >
            {error}
          </div>
        )}

        {/* Table */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '40px 1fr auto' : '60px 1fr auto',
                alignItems: 'center',
                padding: isMobile ? '0 12px 10px' : '0 20px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.2em',
                color: MUTED,
                borderBottom: `1px solid ${MUTED}22`,
              }}
            >
              <span>#</span>
              <span>ИГРОК</span>
              <span>MMR</span>
            </div>

            {/* Player rows */}
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {data.players.map((player, i) => {
                  const isMe = me?.id === player.userId
                  const isTop3 = player.rank <= 3
                  const rankColor = RANK_COLORS[player.rank]

                  return (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.012 }}
                      onClick={() => navigate(`/profile/${player.userId}`)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '40px 1fr auto' : '60px 1fr auto',
                        alignItems: 'center',
                        padding: isMobile ? '10px 12px' : '12px 20px',
                        background: isMe ? `${ACCENT}15` : 'transparent',
                        borderLeft: isMe ? `2px solid ${ACCENT}` : '2px solid transparent',
                        borderBottom: `1px solid ${MUTED}11`,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      whileHover={{
                        backgroundColor: isMe ? `${ACCENT}22` : SURFACE_HOVER,
                      }}
                    >
                      {/* Rank */}
                      <div
                        style={{
                          fontFamily: "'Bebas Neue', cursive",
                          fontSize: isTop3 ? 22 : 16,
                          color: rankColor || MUTED,
                          fontWeight: isTop3 ? 700 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isTop3 && (
                          <span style={{ fontSize: 14 }}>
                            {RANK_LABELS[player.rank]}
                          </span>
                        )}
                        {player.rank}
                      </div>

                      {/* Player info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, minWidth: 0 }}>
                        <PlayerAvatar
                          name={player.name}
                          avatarUrl={player.avatarUrl}
                          size={isTop3 ? 36 : 32}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: isMobile ? 13 : 14,
                              fontWeight: 600,
                              color: player.isPremium ? GOLD : TEXT,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {player.name}
                            {player.isPremium && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: GOLD,
                                  border: `1px solid ${GOLD}44`,
                                  borderRadius: 3,
                                  padding: '1px 5px',
                                  letterSpacing: '0.1em',
                                  fontWeight: 500,
                                }}
                              >
                                PREMIUM
                              </span>
                            )}
                            {isMe && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: ACCENT,
                                  letterSpacing: '0.1em',
                                  fontWeight: 500,
                                }}
                              >
                                ВЫ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* MMR */}
                      <div
                        style={{
                          fontFamily: "'Bebas Neue', cursive",
                          fontSize: isTop3 ? 22 : 18,
                          color: rankColor || TEXT,
                          letterSpacing: '0.05em',
                          textAlign: 'right',
                        }}
                      >
                        {player.mmr.toLocaleString()}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>

            {/* Empty state */}
            {data.players.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: MUTED,
                  letterSpacing: '0.15em',
                }}
              >
                ПОКА НИКОГО НЕТ
              </div>
            )}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: isMobile ? 4 : 6,
                  marginTop: 36,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                }}
              >
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: page === 1 ? `${MUTED}44` : MUTED,
                    cursor: page === 1 ? 'default' : 'pointer',
                    padding: '8px 10px',
                    fontSize: 16,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (page !== 1) (e.target as HTMLElement).style.color = TEXT }}
                  onMouseLeave={e => { if (page !== 1) (e.target as HTMLElement).style.color = MUTED }}
                >
                  {'\u2039'}
                </button>

                {/* Page numbers */}
                {buildPageNumbers(page, data.totalPages).map((p, i) =>
                  p === '...' ? (
                    <span
                      key={`dots-${i}`}
                      style={{ color: MUTED, padding: '4px 2px', userSelect: 'none' }}
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        background: page === p ? ACCENT : 'transparent',
                        border: 'none',
                        color: page === p ? '#fff' : MUTED,
                        borderRadius: 4,
                        padding: isMobile ? '6px 10px' : '6px 12px',
                        cursor: 'pointer',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        fontWeight: page === p ? 700 : 400,
                        transition: 'all 0.15s',
                        minWidth: 36,
                      }}
                      onMouseEnter={e => {
                        if (page !== p) (e.target as HTMLElement).style.color = TEXT
                      }}
                      onMouseLeave={e => {
                        if (page !== p) (e.target as HTMLElement).style.color = MUTED
                      }}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: page === data.totalPages ? `${MUTED}44` : MUTED,
                    cursor: page === data.totalPages ? 'default' : 'pointer',
                    padding: '8px 10px',
                    fontSize: 16,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (page !== data.totalPages) (e.target as HTMLElement).style.color = TEXT
                  }}
                  onMouseLeave={e => {
                    if (page !== data.totalPages) (e.target as HTMLElement).style.color = MUTED
                  }}
                >
                  {'\u203A'}
                </button>
              </motion.div>
            )}

            {/* Page info */}
            {data.totalPages > 1 && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: MUTED,
                  letterSpacing: '0.15em',
                }}
              >
                СТРАНИЦА {data.page} ИЗ {data.totalPages}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
