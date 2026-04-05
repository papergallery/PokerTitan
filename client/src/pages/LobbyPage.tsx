import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchmakingApi } from '../api/matchmaking'
import { Button } from '../components/ui/Button'
import { MMRBadge } from '../components/ui/MMRBadge'
import { Avatar } from '../components/ui/Avatar'

type Format = '1v1' | '5-player'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logoutMutation } = useAuth()
  const [selected, setSelected] = useState<Format | null>(null)
  const [loading, setLoading] = useState(false)

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
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-xl font-bold text-white">PokerTitan</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/profile/${user.id}`)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            <span className="text-white text-sm font-medium">{user.name}</span>
          </button>
          <MMRBadge mmr={user.mmr} size="sm" />
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-muted text-sm hover:text-white transition-colors"
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

        <div className="flex gap-6">
          {([
            { id: '1v1' as Format, title: '1 на 1', desc: 'Быстрый матч · 2 игрока', icon: '⚔️' },
            { id: '5-player' as Format, title: 'Турнир', desc: '5 игроков · Больше MMR', icon: '🏆' },
          ]).map(f => (
            <motion.button
              key={f.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(f.id)}
              className={`
                w-56 p-8 rounded-2xl border-2 text-left transition-all
                ${selected === f.id
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-surface hover:border-accent/50'}
              `}
            >
              <div className="text-5xl mb-4">{f.icon}</div>
              <div className="text-white font-semibold text-lg">{f.title}</div>
              <div className="text-muted text-sm mt-1">{f.desc}</div>
            </motion.button>
          ))}
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
