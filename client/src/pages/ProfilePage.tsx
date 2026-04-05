import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users'
import { Avatar } from '../components/ui/Avatar'
import { MMRBadge } from '../components/ui/MMRBadge'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const userId = parseInt(id ?? '0', 10)

  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getProfile(userId).then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['history', userId],
    queryFn: () => usersApi.getHistory(userId).then(r => r.data),
    enabled: !!userId,
  })

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted">Загрузка...</div>

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <MMRBadge mmr={user.mmr} />
        </div>
      </div>

      {/* History */}
      <h2 className="text-lg font-semibold text-white mb-3">История турниров</h2>
      {history && history.length > 0 ? (
        <div className="flex flex-col gap-2">
          {history.map(h => (
            <div
              key={h.tournamentId}
              className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 border border-border"
            >
              <div>
                <span className="text-white text-sm font-medium">
                  {h.format === '1v1' ? '1 на 1' : 'Турнир 5×5'}
                </span>
                <span className="text-muted text-xs ml-2">#{h.place} место</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${h.mmrChange >= 0 ? 'text-accent' : 'text-red-400'}`}>
                  {h.mmrChange >= 0 ? '+' : ''}{h.mmrChange} MMR
                </span>
                <span className="text-muted text-xs">
                  {new Date(h.finishedAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Нет сыгранных турниров</p>
      )}
    </div>
  )
}
