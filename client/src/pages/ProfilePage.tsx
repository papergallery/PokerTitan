import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users'
import { statsApi } from '../api/stats'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/Avatar'
import { MMRBadge } from '../components/ui/MMRBadge'
import { AvatarCropModal } from '../components/ui/AvatarCropModal'

const noiseSVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const userId = parseInt(id ?? '0', 10)
  const { user: me, logoutMutation } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const isOwner = me?.id === userId

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: user, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getProfile(userId).then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['history', userId],
    queryFn: () => usersApi.getHistory(userId).then(r => r.data),
    enabled: !!userId,
  })

  const { data: extStats } = useQuery({
    queryKey: ['extended-stats', userId],
    queryFn: () => statsApi.getExtendedStats(userId).then(r => r.data),
    enabled: !!user?.isPremium,
  })

  if (!user) return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        letterSpacing: '0.2em',
      }}
    >
      ЗАГРУЗКА...
    </div>
  )

  const handleAvatarClick = () => {
    if (isOwner) fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null)
    setUploading(true)
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      await usersApi.uploadAvatar(file)
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['user', userId] })
      refetch()
    } finally {
      setUploading(false)
    }
  }

  const startEditName = () => {
    setNameValue(user.name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    if (!nameValue.trim()) return
    setSavingName(true)
    try {
      await usersApi.updateName(nameValue.trim())
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['user', userId] })
      refetch()
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  const isPremium = user.isPremium ?? false

  return (
    <>
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onSave={handleCropSave}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          fontFamily: "'JetBrains Mono', monospace",
          position: 'relative',
          overflow: 'hidden',
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

      {/* Page entrance — cinematic fade with subtle vignette reveal */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #000 100%)',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, #c41e3a08 70%, transparent 100%)',
          zIndex: 49,
          pointerEvents: 'none',
        }}
      />
        {/* Accent lines */}
        <div style={{ position: 'fixed', top: 0, right: 0, width: '40vw', height: '2px', background: 'linear-gradient(90deg, transparent, #c41e3a)', zIndex: 2 }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '40vw', height: '1px', background: 'linear-gradient(90deg, #c41e3a33, transparent)', zIndex: 2 }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px 24px 80px',
          }}
        >
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
            <button
              onClick={() => navigate('/lobby')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#555',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f5f0e8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            {isOwner && (
              <button
                onClick={() => logoutMutation.mutate(undefined, { onSuccess: () => navigate('/') })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#555',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                }}
                title="Выйти"
                onMouseEnter={e => (e.currentTarget.style.color = '#c41e3a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Profile header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '48px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {isOwner && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              )}
              <div
                style={{ cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}
                onClick={isOwner ? handleAvatarClick : undefined}
              >
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
                {isOwner && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    {uploading ? (
                      <div style={{ width: '24px', height: '24px', border: '2px solid #f5f0e8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f5f0e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    style={{
                      background: '#111',
                      color: '#f5f0e8',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '32px',
                      letterSpacing: '0.06em',
                      border: '1px solid #c41e3a',
                      padding: '8px 16px',
                      outline: 'none',
                      width: '260px',
                    }}
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    autoFocus
                    maxLength={32}
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: savingName ? 'not-allowed' : 'pointer',
                      color: '#c41e3a',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                      opacity: savingName ? 0.5 : 1,
                    }}
                  >
                    {savingName ? '...' : 'СОХРАНИТЬ'}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#555',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    ОТМЕНА
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h1
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 'clamp(28px, 5vw, 40px)',
                      letterSpacing: '0.06em',
                      color: isPremium ? '#d4af37' : '#f5f0e8',
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {user.name}
                  </h1>
                  {isOwner && (
                    <button
                      onClick={startEditName}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#555',
                        padding: 0,
                        display: 'flex',
                        transition: 'color 0.2s',
                      }}
                      title="Изменить имя"
                      onMouseEnter={e => (e.currentTarget.style.color = '#f5f0e8')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <div style={{ marginTop: '8px' }}>
                <MMRBadge mmr={user.mmr} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#1e1e1e', marginBottom: '32px' }} />

          {/* Extended Stats — Premium Only */}
          {isPremium && extStats && (() => {
            const mmrData = extStats.mmrHistory ?? []
            const mmrValues = mmrData.map(d => d.mmr)
            const minMMR = mmrValues.length ? Math.min(...mmrValues) : 0
            const maxMMR = mmrValues.length ? Math.max(...mmrValues) : 100
            const mmrRange = maxMMR - minMMR || 1
            const svgW = 640
            const svgH = 220
            const padL = 54
            const padR = 16
            const padT = 24
            const padB = 36
            const chartW = svgW - padL - padR
            const chartH = svgH - padT - padB
            const points = mmrData.map((d, i) => {
              const x = padL + (mmrData.length > 1 ? (i / (mmrData.length - 1)) * chartW : chartW / 2)
              const y = padT + chartH - ((d.mmr - minMMR) / mmrRange) * chartH
              return { x, y, mmr: d.mmr, date: d.date }
            })
            const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
            // gradient area fill
            const areaPath = points.length > 1
              ? `M${points[0].x},${padT + chartH} L${points.map(p => `${p.x},${p.y}`).join(' L')} L${points[points.length - 1].x},${padT + chartH} Z`
              : ''
            // grid lines (4 horizontal)
            const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = padT + chartH - frac * chartH
              const val = Math.round(minMMR + frac * mmrRange)
              return { y, val }
            })

            return (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                style={{ marginBottom: '40px' }}
              >
                {/* Section label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '22px',
                    letterSpacing: '0.1em',
                    color: '#d4af37',
                    lineHeight: 1,
                  }}>
                    РАСШИРЕННАЯ СТАТИСТИКА
                  </div>
                  <div style={{
                    fontSize: '9px',
                    letterSpacing: '0.2em',
                    color: '#d4af37',
                    border: '1px solid #d4af3744',
                    padding: '2px 8px',
                    textTransform: 'uppercase',
                  }}>
                    PREMIUM
                  </div>
                </div>

                {/* Stats cards row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '2px',
                  marginBottom: '24px',
                }}>
                  {[
                    { label: 'ИГРЫ', value: String(extStats.totalGames), accent: false },
                    { label: 'ПОБЕДЫ', value: String(extStats.wins), accent: false },
                    { label: 'ВИНРЕЙТ', value: `${extStats.winRate}%`, accent: true },
                  ].map((card) => (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45, duration: 0.4 }}
                      style={{
                        background: '#111',
                        border: '1px solid #2a2a2a',
                        padding: '20px 16px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Subtle top edge accent for winrate card */}
                      {card.accent && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, #c41e3a, transparent)',
                        }} />
                      )}
                      <div style={{
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        color: '#555',
                        marginBottom: '8px',
                      }}>
                        {card.label}
                      </div>
                      <div style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '32px',
                        letterSpacing: '0.04em',
                        color: card.accent ? '#c41e3a' : '#f5f0e8',
                        lineHeight: 1,
                      }}>
                        {card.value}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* MMR Graph */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  style={{
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Corner decoration */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '60px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #c41e3a66)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '2px',
                    height: '40px',
                    background: 'linear-gradient(180deg, #c41e3a66, transparent)',
                  }} />

                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '18px',
                    letterSpacing: '0.1em',
                    color: '#f5f0e8',
                    marginBottom: '16px',
                  }}>
                    ГРАФИК MMR
                  </div>

                  {mmrData.length > 1 ? (
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <linearGradient id="mmrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c41e3a" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#c41e3a" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="mmrLineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#c41e3a" stopOpacity="0.4" />
                          <stop offset="30%" stopColor="#c41e3a" stopOpacity="1" />
                          <stop offset="70%" stopColor="#c41e3a" stopOpacity="1" />
                          <stop offset="100%" stopColor="#c41e3a" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {gridLines.map((g, i) => (
                        <g key={i}>
                          <line
                            x1={padL}
                            y1={g.y}
                            x2={svgW - padR}
                            y2={g.y}
                            stroke="#1e1e1e"
                            strokeWidth="1"
                          />
                          <text
                            x={padL - 10}
                            y={g.y + 4}
                            textAnchor="end"
                            fill="#444"
                            fontSize="11"
                            fontFamily="'JetBrains Mono', monospace"
                          >
                            {g.val}
                          </text>
                        </g>
                      ))}

                      {/* Area fill */}
                      {areaPath && (
                        <path d={areaPath} fill="url(#mmrAreaGrad)" />
                      )}

                      {/* MMR line */}
                      <polyline
                        points={polyline}
                        fill="none"
                        stroke="url(#mmrLineGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data points */}
                      {points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          fill="#111"
                          stroke="#c41e3a"
                          strokeWidth="1.5"
                        />
                      ))}

                      {/* X-axis date labels */}
                      {points.filter((_, i) => {
                        if (points.length <= 6) return true
                        const step = Math.ceil(points.length / 6)
                        return i % step === 0 || i === points.length - 1
                      }).map((p, i) => (
                        <text
                          key={i}
                          x={p.x}
                          y={svgH - 6}
                          textAnchor="middle"
                          fill="#444"
                          fontSize="10"
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {new Date(p.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                        </text>
                      ))}
                    </svg>
                  ) : (
                    <div style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#444',
                      fontSize: '11px',
                      letterSpacing: '0.15em',
                    }}>
                      НЕДОСТАТОЧНО ДАННЫХ ДЛЯ ГРАФИКА
                    </div>
                  )}
                </motion.div>

                {/* Bottom divider to separate from history */}
                <div style={{ height: '1px', background: '#1e1e1e', marginTop: '32px', marginBottom: '0' }} />
              </motion.div>
            )
          })()}

          {/* History */}
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '22px',
              letterSpacing: '0.1em',
              color: '#f5f0e8',
              marginBottom: '16px',
            }}
          >
            ИСТОРИЯ ТУРНИРОВ
          </div>

          {history && history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {history.map(h => (
                <div
                  key={h.tournamentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    padding: '16px 20px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#f5f0e8', fontSize: '13px', letterSpacing: '0.05em' }}>
                      {h.format === '1v1' ? '1 НА 1' : h.format === '1v1-turbo' ? 'TURBO' : h.format === '5-player-bounty' ? 'BOUNTY' : 'ТУРНИР 5 ИГР.'}
                    </span>
                    <span style={{ color: '#555', fontSize: '11px', letterSpacing: '0.1em' }}>
                      #{h.place} МЕСТО
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '18px',
                        letterSpacing: '0.05em',
                        color: h.mmrChange >= 0 ? '#c41e3a' : '#666',
                      }}
                    >
                      {h.mmrChange >= 0 ? '+' : ''}{h.mmrChange} MMR
                    </span>
                    <span style={{ color: '#555', fontSize: '11px', letterSpacing: '0.05em' }}>
                      {new Date(h.finishedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#555', fontSize: '12px', letterSpacing: '0.15em' }}>
              НЕТ СЫГРАННЫХ ТУРНИРОВ
            </p>
          )}
        </motion.div>
      </div>
    </>
  )
}
