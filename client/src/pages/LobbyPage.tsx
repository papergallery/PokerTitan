import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchmakingApi } from '../api/matchmaking'
import { Button } from '../components/ui/Button'
import { MMRBadge } from '../components/ui/MMRBadge'
import { Avatar } from '../components/ui/Avatar'

type Format = '1v1' | '5-player' | '1v1-turbo' | '5-player-bounty'

const formats = [
  { id: '1v1' as Format, title: '1 на 1', desc: 'Быстрый матч · 2 игрока', icon: '⚔️', premium: false },
  { id: '5-player' as Format, title: 'Турнир', desc: '5 игроков · Больше MMR', icon: '🏆', premium: false },
  { id: '1v1-turbo' as Format, title: 'Turbo', desc: '1 на 1 · Таймер 10 сек', icon: '⚡', premium: true },
  { id: '5-player-bounty' as Format, title: 'Bounty', desc: '5 игроков · +MMR за каждого', icon: '💀', premium: true },
]

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logoutMutation } = useAuth()
  const [selected, setSelected] = useState<Format | null>(null)
  const [loading, setLoading] = useState(false)

  const isPremium = user?.isPremium ?? false

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-9 py-6 border-b border-border">
        <span className="text-2xl font-bold text-white">PokerTitan</span>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(`/profile/${user.id}`)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
            <span className="text-white text-lg font-medium">{user.name}</span>
          </button>
          <MMRBadge mmr={user.mmr} />
          <button
            onClick={() => navigate('/shop')}
            className="text-muted text-lg hover:text-white transition-colors"
          >
            Магазин
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-muted text-lg hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Выбери формат
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-2 sm:px-0">
          {formats.map(f => {
            const locked = f.premium && !isPremium
            return (
              <div key={f.id} className="relative">
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => !locked && setSelected(f.id)}
                  className={`
                    w-full p-8 sm:p-12 rounded-2xl border-2 text-left transition-all
                    ${locked ? 'opacity-60 cursor-not-allowed' : ''}
                    ${selected === f.id ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/50'}
                  `}
                >
                  <div className="text-5xl sm:text-7xl mb-4 sm:mb-6">{f.icon}</div>
                  <div className="text-white font-semibold text-xl sm:text-2xl">{f.title}</div>
                  <div className="text-muted text-sm sm:text-base mt-1 sm:mt-2">{f.desc}</div>
                </motion.button>
                {locked && (
                  <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <span className="text-2xl">🔒</span>
                    <span className="text-amber-400 text-xs font-bold">PREMIUM</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Button
          size="lg"
          disabled={!selected || loading}
          onClick={handleFindGame}
        >
          {loading ? 'Поиск...' : 'Найти игру'}
        </Button>
      </main>
    </div>
  )
}
